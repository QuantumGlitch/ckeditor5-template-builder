import Command from '@ckeditor/ckeditor5-core/src/command';

export default class InsertExpressionCommand extends Command {
  execute({ expression }) {
    this.editor.model.change((writer) => {
      // Create the element
      const element = this.createExpression(writer, { expression });

      // Insert it in the model
      this.editor.model.insertContent(element);

      // Put the selection on the element
      writer.setSelection(element, 'on');
    });
  }

  refresh() {
    // We need the templateBuilder config to enable the use of the command
    const templateBuilder = this.editor.templateBuilder;

    if (templateBuilder) {
      const model = this.editor.model;
      const selection = model.document.selection;
      const allowedIn = model.schema.findAllowedParent(
        selection.getFirstPosition(),
        'dataExpression'
      );

      this.isEnabled = allowedIn !== null;
    } else this.isEnabled = false;
  }

  createExpression(writer, { expression }) {
    const dataExpression = writer.createElement('dataExpression', {
      expression,
    });

    return dataExpression;
  }
}
