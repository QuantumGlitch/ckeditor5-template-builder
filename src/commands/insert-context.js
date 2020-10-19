import Command from '@ckeditor/ckeditor5-core/src/command';

export default class InsertContextCommand extends Command {
  execute() {
    this.editor.model.change((writer) => {
      // Create the element
      const element = this.createDataContext(writer);

      // Insert it
      this.editor.model.insertContent(element);

      // Put the selection on the element
      writer.setSelection(element, 'on');
    });
  }

  refresh() {
    // We need the data config to enable the use of the command
    const data = this.editor.templateBuilder;

    if (data) {
      const model = this.editor.model;
      const selection = model.document.selection;
      const allowedIn = model.schema.findAllowedParent(
        selection.getFirstPosition(),
        'dataContext'
      );

      this.isEnabled = allowedIn !== null;
    } else this.isEnabled = false;
  }

  createDataContext(writer) {
    const dataContext = writer.createElement('dataContext', {
      identifier: this.editor.templateBuilder.identifier(),
    });

    const dataControlExpression = writer.createElement('dataControlExpression', {
      identifier: this.editor.templateBuilder.identifier(),
    });

    const dataContent = writer.createElement('dataContent');

    writer.append(dataControlExpression, dataContext);
    writer.append(dataContent, dataContext);

    // There must be at least one paragraph for the content to be editable.
    // See https://github.com/ckeditor/ckeditor5/issues/1464.
    writer.appendElement('paragraph', dataContent);

    return dataContext;
  }
}
