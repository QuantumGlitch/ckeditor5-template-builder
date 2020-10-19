import { ModelDefinition, RootContext } from 'js-template-builder';

import Editing from './editing';
import UI from './ui';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

const CHARSET_IDENTIFIER = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789';
const ID_LENGTH = 10;

export function generateIdentifier() {
  return Array(ID_LENGTH)
    .fill()
    .map(() => CHARSET_IDENTIFIER[Math.round(Math.random() * (CHARSET_IDENTIFIER.length - 1))])
    .join('');
}

export default class TemplateBuilder extends Plugin {
  static get requires() {
    return [Editing, UI];
  }

  init() {
    this.editor.resetTemplateBuilder = () => {
      // if templateBuilder config exists, parse the model definition and redefine the context
      if (this.editor.config.get('templateBuilder')) {
        const { modelDefinition } = this.editor.config.get('templateBuilder');
        const parsed = ModelDefinition.parseFromRawObject(modelDefinition);

        this.editor.set('templateBuilder', {
          modelDefinition: parsed,
          rootContext: new RootContext({ modelDefinition: parsed }),
          viewRefresherMap: new Map(),
          identifiersMap: new Map(),
          /**
           * Generate a new identifier if id already exists or if it hasn't got a value
           * @param {String|null} id
           */
          identifier(id) {
            // Id has a value
            if (id) {
              // Id already exists
              if (this.identifiersMap.has(id)) return this.identifier(generateIdentifier());
              // Id doesn't exist so register it as existing one
              else {
                this.identifiersMap.set(id, null);
                return id;
              }
            }
            // No value, generate a new one
            else return this.identifier(generateIdentifier());
          },
        });
      } else this.editor.set('templateBuilder', null);
    };

    this.editor.resetTemplateBuilder();
  }
}
