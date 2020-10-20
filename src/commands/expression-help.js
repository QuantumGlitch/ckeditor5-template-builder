import Swal from 'sweetalert2';

import Command from '../../../@ckeditor/ckeditor5-core/src/command';

export default class ExpressionHelpCommand extends Command {
  execute() {
    const t = this.editor.t;

    const model = this.editor.model;
    const selection = model.document.selection;

    // root model definition
    const { modelDefinition } = this.editor.templateBuilder;

    const contextsVariables = [];
    /* 
      Start from selection position to the highest ancestor:
      Take every context available so we can show all the possible variables
    */
    let parent = selection.getFirstPosition().parent;
    while (parent) {
      if (parent.name === 'dataContext') {
        const currentContextVariables = this.editor.templateBuilder.identifiersMap.get(
          parent.getAttribute('identifier')
        ).context.variables;

        if (currentContextVariables)
          // Add every context variable to all contexts variables
          currentContextVariables.forEach((v) => contextsVariables.push(v));
      }
      parent = parent.parent;
    }

    // Always include starting props of model definition
    if (modelDefinition && modelDefinition.props)
      modelDefinition.props.forEach((p) => contextsVariables.push(p));

    function getNodeByPath(path) {
      const pathNodes = path.split('.');
      const name = pathNodes.shift();
      let node = contextsVariables.find((v) => v.name === name);
      if (!node) return null;

      // Starting from root, search in properties the next node
      pathNodes.forEach((nodeName) => (node = node.props.find((v) => v.name === nodeName)));

      return node;
    }

    // Always ask for more information on a variable
    let moreInfoOn = null;
    let moreInfoOnNode = { props: contextsVariables };

    function showMoreInfo() {
      moreInfoOn = Swal.fire({
        title: 'Expression help',
        html:
          (moreInfoOnNode.name
            ? `${t('Current Context')}<br /><br />
                  ${t('Path')} <strong>${moreInfoOn}</strong><br />
                  ${t('Name')} <strong>${moreInfoOnNode.name}</strong><br />
                  ${t('Type')} ${t(moreInfoOnNode.type)}<br />
                  ${t('Description')} ${moreInfoOnNode.description}<br /><br />`
            : '') +
          (moreInfoOnNode.props
            ? t(`This is the list of all available properties :`) +
              '<br /><br />' +
              moreInfoOnNode.props
                .map(
                  (node) => `
                ${t('Name')} <strong>${node.name}</strong><br />
                ${t('Type')} ${node.type}<br />
                ${t('Description')} ${node.description}<br />`
                )
                .join('<br />')
            : '') +
          '<br />' +
          t(`Choose a property to show info about it :`),
        input: moreInfoOnNode.props ? 'select' : 'text',
        ...(moreInfoOnNode.props ? {} : { inputValue: moreInfoOn }),
        inputOptions: moreInfoOnNode.props
          ? moreInfoOnNode.props.reduce((state, v) => {
              const path = (moreInfoOn ? `${moreInfoOn}.` : '') + v.name;
              return { ...state, [path]: path };
            }, {})
          : null,
        confirmButtonText: t('Ok'),
        showCancelButton: true,
        cancelButtonText: t('Cancel'),
      }).then(({ value }) => {
        moreInfoOn = value;
        if (moreInfoOn) {
          // Find variable node
          let node = getNodeByPath(moreInfoOn);

          if (!node) return alert(t("Can't find a path. Did you write it correctly ?"));

          moreInfoOnNode = node;
          showMoreInfo();
        }
      });
    }

    showMoreInfo();
  }

  refresh() {
    // We need the templateBuilder config to enable the use of the command
    const templateBuilder = this.editor.templateBuilder;
    this.isEnabled = !!templateBuilder;
  }
}
