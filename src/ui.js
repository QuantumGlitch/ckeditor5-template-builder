import Swal from 'sweetalert2';

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';

export default class DynamicDataManagerUI extends Plugin {
  init() {
    const editor = this.editor;
    const t = editor.t;

    // The "dataContext" button must be registered among the UI components of the editor
    // to be displayed in the toolbar.
    editor.ui.componentFactory.add('dataContext', (locale) => {
      // The state of the button will be bound to the widget command.
      const command = editor.commands.get('insertContext');

      // The button will be an instance of ButtonView.
      const buttonView = new ButtonView(locale);

      buttonView.set({
        label: '⚙️',
        labelStyle: 'font-size: 20px; line-height: normal;',
        withText: true,
        tooltip: t('Context'),
      });

      // Bind the state of the button to the command.
      buttonView.bind('isOn', 'isEnabled').to(command, 'value', 'isEnabled');

      // When the button is clicked, execute the command
      buttonView.on('execute', () => command.execute());

      return buttonView;
    });

    // The "expression" button must be registered among the UI components of the editor
    // to be displayed in the toolbar.
    editor.ui.componentFactory.add('dataExpression', (locale) => {
      // The state of the button will be bound to the widget command.
      const command = editor.commands.get('insertExpression');

      // The button will be an instance of ButtonView.
      const buttonView = new ButtonView(locale);

      buttonView.set({
        label: '🏷',
        labelStyle: 'font-size: 20px; line-height: normal;',
        withText: true,
        tooltip: t('Expression'),
      });

      // Bind the state of the button to the command.
      buttonView.bind('isOn', 'isEnabled').to(command, 'value', 'isEnabled');

      // When the button is clicked, execute the command
      buttonView.on('execute', () => {
        Swal.fire({
          html: `
            ${t('Insert the expression:')} <br />    
          `,
          input: 'text',
          confirmButtonText: t('Ok'),
          showCancelButton: true,
          cancelButtonText: t('Cancel'),
        }).then(({ value }) => {
          if (value) command.execute({ expression: value });
        });
      });

      return buttonView;
    });

    // The "expression" button must be registered among the UI components of the editor
    // to be displayed in the toolbar.
    editor.ui.componentFactory.add('dataDeclarationExpression', (locale) => {
      // The state of the button will be bound to the widget command.
      const command = editor.commands.get('insertDeclaration');

      // The button will be an instance of ButtonView.
      const buttonView = new ButtonView(locale);

      buttonView.set({
        label: '📌',
        labelStyle: 'font-size: 20px; line-height: normal;',
        withText: true,
        tooltip: t('Declaration'),
      });

      // Bind the state of the button to the command.
      buttonView.bind('isOn', 'isEnabled').to(command, 'value', 'isEnabled');

      // When the button is clicked, execute the command
      buttonView.on('execute', () => {
        Swal.fire({
          html: `
            ${t('Insert the declaration:')} <br />    
          `,
          input: 'text',
          confirmButtonText: t('Ok'),
          showCancelButton: true,
          cancelButtonText: t('Cancel'),
        }).then(({ value }) => {
          if (value) command.execute({ expression: value });
        });
      });

      return buttonView;
    });

    // The "expressionHelp" button must be registered among the UI components of the editor
    // to be displayed in the toolbar.
    editor.ui.componentFactory.add('expressionHelp', (locale) => {
      // The state of the button will be bound to the command.
      const command = editor.commands.get('expressionHelp');

      // The button will be an instance of ButtonView.
      const buttonView = new ButtonView(locale);

      buttonView.set({
        label: 'ℹ️',
        labelStyle: 'font-size: 20px; line-height: normal;',
        withText: true,
        tooltip: t('Expression help'),
      });

      // Bind the state of the button to the command.
      buttonView.bind('isOn', 'isEnabled').to(command, 'value', 'isEnabled');

      // When the button is clicked, execute the command
      buttonView.on('execute', () => command.execute());

      return buttonView;
    });
  }
}
