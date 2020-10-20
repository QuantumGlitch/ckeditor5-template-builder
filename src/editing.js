import { Context, Expression, ControlExpression } from 'js-template-builder/src/index';

import Plugin from '../../@ckeditor/ckeditor5-core/src/plugin';
import Widget from '../../@ckeditor/ckeditor5-widget/src/widget';

import {
  toWidget,
  toWidgetEditable,
  viewToModelPositionOutsideModelElement,
} from '../../@ckeditor/ckeditor5-widget/src/utils';

import InsertContextCommand from './commands/insert-context';
import InsertExpressionCommand from './commands/insert-expression';
import InsertDeclarationCommand from './commands/insert-declaration';
import ExpressionHelpCommand from './commands/expression-help';

export default class DynamicDataManagerEditing extends Plugin {
  static get requires() {
    return [Widget];
  }

  init() {
    this._defineSchema();
    this._defineConverters();

    this.editor.commands.add('insertContext', new InsertContextCommand(this.editor));
    this.editor.commands.add('insertExpression', new InsertExpressionCommand(this.editor));
    this.editor.commands.add('insertDeclaration', new InsertDeclarationCommand(this.editor));
    this.editor.commands.add('expressionHelp', new ExpressionHelpCommand(this.editor));

    // Fix selection on data-expression
    this.editor.editing.mapper.on(
      'viewToModelPosition',
      viewToModelPositionOutsideModelElement(
        this.editor.model,
        (viewElement) =>
          viewElement.hasClass('data-expression') ||
          viewElement.hasClass('data-declaration-expression')
      )
    );
  }

  _defineSchema() {
    const schema = this.editor.model.schema;

    // The root
    schema.register('dataContext', {
      // Behaves like a self-contained object
      isObject: true,
      // Allow in places where other blocks are allowed
      allowWhere: '$block',
      allowAttributes: ['identifier'],
    });

    // The dataControlExpression specify which kind of operation will be operated on the block
    schema.register('dataControlExpression', {
      isLimit: true,
      allowIn: 'dataContext',
      allowAttributes: ['identifier'],
    });

    // Enable only text inside dataControlExpression
    this.editor.model.schema.addChildCheck(
      (context, childDefinition) => {
        if (context.endsWith('dataControlExpression') && childDefinition)
          return childDefinition.name === '$text';
      },
      {
        priority: 'highest',
      }
    );

    // Disable attributes on dataControlExpression
    this.editor.model.schema.addAttributeCheck((context) => {
      if (context.endsWith('dataControlExpression $text')) return false;
    });

    // The dataContent is the content on which the operation is executed
    schema.register('dataContent', {
      // Cannot be split or left by the caret.
      isLimit: true,
      allowIn: 'dataContext',
      // Allow content which is allowed in the root
      allowContentOf: '$root',
    });

    // Enable everything inside dataContent
    this.editor.model.schema.addChildCheck(
      (context, childDefinition) => {
        if (context.endsWith('dataContent') && childDefinition) return true;
      },
      {
        priority: 'highest',
      }
    );

    // The dataExpression specify an expression that once evalueted will be shown
    schema.register('dataExpression', {
      allowWhere: '$text',
      isObject: true,
      allowAttributes: ['expression', 'bold', 'italic', 'fontSize', 'fontColor'],
    });

    // The dataDeclarationExpression specify an expression that add a new variable to the context
    schema.register('dataDeclarationExpression', {
      allowWhere: '$text',
      isObject: true,
      allowAttributes: ['expression'],
    });
  }

  _defineConverters() {
    const conversion = this.editor.conversion;
    const templateBuilder = () => this.editor.templateBuilder;
    const t = this.editor.t;

    //#region <dataContext> converters
    conversion.for('upcast').elementToElement({
      view: {
        name: 'section',
        classes: 'data-context',
      },
      model: (viewElement, { writer: modelWriter }) =>
        modelWriter.createElement('dataContext', {
          identifier: templateBuilder().identifier(viewElement.getAttribute('identifier')),
        }),
    });

    conversion.for('dataDowncast').elementToElement({
      model: 'dataContext',
      view: (modelElement, { writer: viewWriter }) => {
        const identifier = modelElement.getAttribute('identifier');
        const widgetElement = viewWriter.createContainerElement('section', {
          class: 'data-context',
          identifier,
        });

        return toWidget(widgetElement, viewWriter);
      },
    });

    conversion.for('editingDowncast').elementToElement({
      model: 'dataContext',
      view: (modelElement, { writer: viewWriter }) => {
        const identifier = modelElement.getAttribute('identifier');

        // Map this element
        if (!templateBuilder().identifiersMap.get(identifier)) {
          // Is not mapped so we need to find his parent context
          const parent = modelElement.findAncestor('dataContext');
          let currentContext = null;

          if (parent) {
            // We have a parent context
            const { context: parentContext } = templateBuilder().identifiersMap.get(
              parent.getAttribute('identifier')
            );

            // Create a new context for this model element
            currentContext = new Context({ parent: parentContext });
          }
          // Is in root
          else currentContext = new Context({ parent: templateBuilder().rootContext });

          // Finally map the new context with the model element
          templateBuilder().identifiersMap.set(identifier, {
            element: modelElement,
            context: currentContext,
          });
        }

        const widgetElement = viewWriter.createContainerElement('section', {
          class: 'data-context',
          identifier,
        });

        return toWidget(widgetElement, viewWriter, { label: t('Context') });
      },
    });

    // Watch for the removing of dataContext elements
    conversion.for('editingDowncast').add(
      (downcastDispatcher) => {
        downcastDispatcher.on('remove', (e, data) => {
          // Search who has been removed
          const removedIdentifiers = [];

          if (templateBuilder()) {
            // Remove from map all elements that have been moved to $graveyard
            templateBuilder().identifiersMap.forEach((mappedIdentifier, identifier) => {
              if (
                mappedIdentifier &&
                mappedIdentifier.element &&
                mappedIdentifier.element.root.rootName === '$graveyard'
              ) {
                removedIdentifiers.push(identifier);

                if (mappedIdentifier.context)
                  // Has no longer a parent and his parent has no longer this child
                  mappedIdentifier.context.parent = null;
              }
            });

            // Remove from map
            removedIdentifiers.forEach((identifier) =>
              templateBuilder().identifiersMap.delete(identifier)
            );
          }
        });
      },
      { priority: 'lowest' }
    );
    //#endregion

    //#region <dataControlExpression> converters
    conversion.for('upcast').elementToElement({
      view: {
        name: 'div',
        classes: 'data-control-expression',
      },
      model: (viewElement, { writer: modelWriter }) =>
        modelWriter.createElement('dataControlExpression', {
          identifier: templateBuilder().identifier(viewElement.getAttribute('identifier')),
        }),
    });

    /**
     * Helper for both downcasters, to ensure the expression will be validated
     */
    function validateDataControlExpression(modelElement, templateBuilder) {
      const identifier = modelElement.getAttribute('identifier');

      // Debounce the validation
      // The validation will start when the user will have stopped writing since 1000ms

      // There is already a refresher, let's clear
      const refresher = templateBuilder.viewRefresherMap.get(identifier);
      if (refresher) clearTimeout(refresher);

      templateBuilder.viewRefresherMap.set(
        identifier,
        setTimeout(() => {
          const expressionElement = modelElement.getChild(0);

          // If controlExpression has been mapped and the expressionElement has data
          if (expressionElement) {
            const parent = templateBuilder.identifiersMap.get(
              modelElement.parent.getAttribute('identifier')
            );

            if (parent) {
              // Get parent context and validate it
              const { context } = parent;

              // Retrieve control expression
              const { expression: controlExpression } = templateBuilder.identifiersMap.get(
                identifier
              );

              // Set its new value
              controlExpression.value = expressionElement.data;

              // Validate context (the most expensive part)
              const valid = context.validate();

              // Ugly way to do it NOW absolutelly ANTI-PATTERN, but it works! ;)
              // Update view
              const DOMElement = document.querySelector(`[identifier='${identifier}']`);

              if (DOMElement) {
                DOMElement.setAttribute('valid', valid ? 'true' : 'false');

                // Show error message or valid message
                if (valid) {
                  DOMElement.removeAttribute('error');
                  if (controlExpression.description)
                    DOMElement.setAttribute('description', controlExpression.description);
                } else if (controlExpression.error) {
                  DOMElement.removeAttribute('description');
                  DOMElement.setAttribute('error', controlExpression.error);
                }
              }
            }
          }

          // Refresher done
          templateBuilder.viewRefresherMap.set(identifier, null);
        }, 500)
      );
    }

    conversion.for('dataDowncast').elementToElement({
      model: 'dataControlExpression',
      view: (modelElement, { writer: viewWriter }) => {
        validateDataControlExpression(modelElement, templateBuilder());

        return toWidget(
          viewWriter.createContainerElement('div', {
            class: 'data-control-expression',
            identifier: modelElement.getAttribute('identifier'),
          }),
          viewWriter
        );
      },
    });

    // On focus or change text inside dataControlExpression, validate the expression
    conversion.for('downcast').add(
      (dispatcher) => {
        dispatcher.on('insert:$text', (evt, data) => {
          if (data.item.parent.name === 'dataControlExpression')
            validateDataControlExpression(data.item.parent, templateBuilder());
        });
        dispatcher.on('remove:$text', (evt, data) => {
          if (data.position.parent.name === 'dataControlExpression')
            validateDataControlExpression(data.position.parent, templateBuilder());
        });

        let selectedBefore = null;
        dispatcher.on('selection', (evt, data) => {
          if (
            data.selection.anchor &&
            data.selection.anchor.parent.name == 'dataControlExpression'
          ) {
            validateDataControlExpression(data.selection.anchor.parent, templateBuilder());
            selectedBefore = data.selection.anchor.parent;
          }
          // Validate again on focus out
          else if (selectedBefore) {
            validateDataControlExpression(selectedBefore, templateBuilder());
            selectedBefore = null;
          }

          return true;
        });
      },
      { priority: 'low' }
    );

    conversion.for('editingDowncast').elementToElement({
      model: 'dataControlExpression',
      view: (modelElement, { writer: viewWriter }) => {
        const identifier = modelElement.getAttribute('identifier');

        // Map this element
        if (!templateBuilder().identifiersMap.get(identifier)) {
          // Parent is processed before this element, so this must exist :
          const { context } = templateBuilder().identifiersMap.get(
            modelElement.parent.getAttribute('identifier')
          );

          context.controlExpression = new ControlExpression();

          templateBuilder().identifiersMap.set(identifier, {
            element: modelElement,
            expression: context.controlExpression,
          });

          const expressionElement = modelElement.getChild(0);

          // The model is already initializated
          /* 
            It will be validated again after this, 
            but we need to validate it now anyway because 
            children of type dataExpression won't be valid
          */
          if (expressionElement) {
            context.controlExpression.value = expressionElement.data;

            // Validate context
            context.validate();

            // This way validateDataControlExpression will execute again the validation
            context.controlExpression.value = null;
          }
        }

        validateDataControlExpression(modelElement, templateBuilder());

        return toWidgetEditable(
          viewWriter.createEditableElement('div', {
            class: 'data-control-expression',
            identifier,
          }),
          viewWriter
        );
      },
    });
    //#endregion

    //#region <dataContent> converters
    conversion.for('upcast').elementToElement({
      view: {
        name: 'div',
        classes: 'data-content',
      },
      model: 'dataContent',
    });

    conversion.for('dataDowncast').elementToElement({
      model: 'dataContent',
      view: {
        name: 'div',
        classes: 'data-content',
      },
    });

    conversion.for('editingDowncast').elementToElement({
      model: 'dataContent',
      view: (modelElement, { writer: viewWriter }) =>
        toWidgetEditable(
          viewWriter.createEditableElement('div', {
            class: 'data-content',
          }),
          viewWriter
        ),
    });
    //#endregion

    //#region <dataExpression> converters
    conversion.for('upcast').elementToElement({
      view: {
        name: 'span',
        classes: 'data-expression',
      },
      model: (viewElement, { writer: modelWriter }) => {
        const expression = viewElement.getChild(0).data;
        const identifier = templateBuilder().identifier(viewElement.getAttribute('identifier'));

        const bold = viewElement.getAttribute('bold'),
          italic = viewElement.getAttribute('italic'),
          fontSize = viewElement.getAttribute('fontsize'),
          fontColor = viewElement.getAttribute('fontcolor');

        return modelWriter.createElement('dataExpression', {
          expression,
          identifier,
          ...(bold ? { bold } : {}),
          ...(italic ? { italic } : {}),
          ...(fontSize ? { fontSize } : {}),
          ...(fontColor ? { fontColor } : {}),
        });
      },
    });

    // Helper method for both downcast converters.
    function createDataExpressionView(modelElement, viewWriter, templateBuilder) {
      const expressionValue = modelElement.getAttribute('expression');

      let valid = null;
      let expression = null;

      if (templateBuilder) {
        // Retrieve parent context or take rootContext
        const parentContextElement = modelElement.findAncestor('dataContext');

        const parentContext = parentContextElement
          ? templateBuilder.identifiersMap.get(parentContextElement.getAttribute('identifier'))
              .context
          : templateBuilder.rootContext;

        // Create the expression's validation
        expression = new Expression({ value: expressionValue });
        valid = expression.validate({ context: parentContext });
      }

      const bold = modelElement.getAttribute('bold'),
        italic = modelElement.getAttribute('italic'),
        fontSize = modelElement.getAttribute('fontSize'),
        fontColor = modelElement.getAttribute('fontColor');

      const dataExpressionView = viewWriter.createContainerElement('span', {
        class: `data-expression`,
        ...{ valid },
        ...(valid
          ? {
              description: expression.description,
            }
          : {
              error: expression.error,
            }),
        ...(bold ? { bold } : {}),
        ...(italic ? { italic } : {}),
        ...(fontSize ? { fontSize } : {}),
        ...(fontColor ? { fontColor } : {}),
      });

      // Insert the placeholder name (as a text).
      const innerText = viewWriter.createText(expressionValue);
      viewWriter.insert(viewWriter.createPositionAt(dataExpressionView, 0), innerText);

      return dataExpressionView;
    }

    conversion.for('dataDowncast').elementToElement({
      model: 'dataExpression',
      view: (modelElement, { writer: viewWriter }) =>
        createDataExpressionView(modelElement, viewWriter, templateBuilder()),
    });

    conversion.for('editingDowncast').elementToElement({
      model: 'dataExpression',
      view: (modelElement, { writer: viewWriter }) =>
        toWidget(createDataExpressionView(modelElement, viewWriter, templateBuilder()), viewWriter),
    });

    // Handle styling attributes for dataExpression ( priority low so it will be executed after all others datadowncasters)
    conversion.for('downcast').add(
      (dispatcher) => {
        function stylingHandler(evt, data, conversionApi) {
          const modelElement = data.item;

          const viewWriter = conversionApi.writer;
          const viewElement = conversionApi.mapper.toViewElement(modelElement);

          if (!viewElement) return;

          if (data.attributeNewValue)
            viewWriter.setAttribute(
              data.attributeKey.toLowerCase(),
              data.attributeNewValue,
              viewElement
            );
          else viewWriter.removeAttribute(data.attributeKey.toLowerCase(), viewElement);
        }

        dispatcher.on('attribute:bold:dataExpression', stylingHandler);
        dispatcher.on('attribute:italic:dataExpression', stylingHandler);
        dispatcher.on('attribute:fontSize:dataExpression', stylingHandler);
        dispatcher.on('attribute:fontColor:dataExpression', stylingHandler);
      },
      { priority: 'low' }
    );
    //#endregion

    //#region <dataDeclarationExpression> converters
    conversion.for('upcast').elementToElement({
      view: {
        name: 'span',
        classes: 'data-declaration',
      },
      model: (viewElement, { writer: modelWriter }) => {
        const expression = viewElement.getChild(0).data;
        const identifier = templateBuilder().identifier(viewElement.getAttribute('identifier'));

        return modelWriter.createElement('dataDeclarationExpression', {
          expression,
          identifier,
        });
      },
    });

    // Helper method for both downcast converters.
    function createDataDeclarationExpressionView(modelElement, viewWriter, templateBuilder) {
      const expressionValue = modelElement.getAttribute('expression');

      let valid = null;
      let expression = null;

      if (templateBuilder) {
        // Retrieve parent context or take rootContext
        const parentContextElement = modelElement.findAncestor('dataContext');

        const parentContext = parentContextElement
          ? templateBuilder.identifiersMap.get(parentContextElement.getAttribute('identifier'))
              .context
          : templateBuilder.rootContext;

        // Create the expression's validation
        expression = new Expression({ value: expressionValue });
        valid = expression.validate({ context: parentContext });
      }

      const dataExpressionView = viewWriter.createContainerElement('span', {
        class: `data-declaration`,
        ...{ valid },
        ...(valid
          ? {
              description: expression.description,
            }
          : {
              error: expression.error,
            }),
      });

      // Insert the placeholder name (as a text).
      const innerText = viewWriter.createText(expressionValue);
      viewWriter.insert(viewWriter.createPositionAt(dataExpressionView, 0), innerText);

      return dataExpressionView;
    }

    conversion.for('dataDowncast').elementToElement({
      model: 'dataDeclarationExpression',
      view: (modelElement, { writer: viewWriter }) =>
        createDataDeclarationExpressionView(modelElement, viewWriter, templateBuilder()),
    });

    conversion.for('editingDowncast').elementToElement({
      model: 'dataDeclarationExpression',
      view: (modelElement, { writer: viewWriter }) =>
        toWidget(
          createDataDeclarationExpressionView(modelElement, viewWriter, templateBuilder()),
          viewWriter
        ),
    });
    //#endregion
  }
}
