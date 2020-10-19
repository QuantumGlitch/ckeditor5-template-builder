/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

// The editor creator to use.
import ClassicEditorBase from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';
import UploadAdapter from '@ckeditor/ckeditor5-adapter-ckfinder/src/uploadadapter';
import Autoformat from '@ckeditor/ckeditor5-autoformat/src/autoformat';
import FontSize from '@ckeditor/ckeditor5-font/src/fontsize';
import FontColor from '@ckeditor/ckeditor5-font/src/fontcolor';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
import BlockQuote from '@ckeditor/ckeditor5-block-quote/src/blockquote';
import CKFinder from '@ckeditor/ckeditor5-ckfinder/src/ckfinder';
import EasyImage from '@ckeditor/ckeditor5-easy-image/src/easyimage';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Image from '@ckeditor/ckeditor5-image/src/image';
import ImageCaption from '@ckeditor/ckeditor5-image/src/imagecaption';
import ImageStyle from '@ckeditor/ckeditor5-image/src/imagestyle';
import ImageToolbar from '@ckeditor/ckeditor5-image/src/imagetoolbar';
import ImageUpload from '@ckeditor/ckeditor5-image/src/imageupload';
import ImageResize from '@ckeditor/ckeditor5-image/src/imageresize';
import Indent from '@ckeditor/ckeditor5-indent/src/indent';
import Link from '@ckeditor/ckeditor5-link/src/link';
import List from '@ckeditor/ckeditor5-list/src/list';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import PasteFromOffice from '@ckeditor/ckeditor5-paste-from-office/src/pastefromoffice';
import Table from '@ckeditor/ckeditor5-table/src/table';
import TableToolbar from '@ckeditor/ckeditor5-table/src/tabletoolbar';
import TableProperties from '@ckeditor/ckeditor5-table/src/tableproperties';
import TableCellProperties from '@ckeditor/ckeditor5-table/src/tablecellproperties';
import TextTransformation from '@ckeditor/ckeditor5-typing/src/texttransformation';
import Alignment from '@ckeditor/ckeditor5-alignment/src/alignment';
import PageBreak from '@ckeditor/ckeditor5-page-break/src/pagebreak';

/**
 * Custom plugin
 */
import TemplateBuilder from '../../index';

export default class CustomEditor extends ClassicEditorBase {}

// Plugins to include in the build.
CustomEditor.builtinPlugins = [
  Essentials,
  UploadAdapter,
  Autoformat,
  FontSize,
  FontColor,
  Bold,
  Italic,
  BlockQuote,
  CKFinder,
  EasyImage,
  Heading,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  ImageResize,
  Indent,
  Link,
  List,
  Paragraph,
  PasteFromOffice,
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties,
  TextTransformation,
  Alignment,
  PageBreak,
  TemplateBuilder,
];

// Editor configuration.
CustomEditor.defaultConfig = {
  extraPlugins: [
    // this is for allowing nested tables
    function (editor) {
      editor.model.schema.on(
        'checkChild',
        (evt, args) => {
          const context = args[0];
          const childDefinition = args[1];

          if (context.endsWith('tableCell') && childDefinition && childDefinition.name == 'table') {
            // Prevent next listeners from being called.
            evt.stop();
            // Set the checkChild()'s return value.
            evt.return = true;
          }
        },
        {
          priority: 'highest',
        }
      );
    },
  ],
  font: {
    options: 'default',
  },
  toolbar: {
    items: [
      'heading',
      '|',
      'alignment',
      'fontSize',
      'fontColor',
      'bold',
      'italic',
      'link',
      'bulletedList',
      'numberedList',
      '|',
      'indent',
      'outdent',
      '|',
      'pageBreak',
      '|',
      'imageUpload',
      'blockQuote',
      'insertTable',
      'undo',
      'redo',
      '|',
      'expressionHelp',
      'dataContext',
      'dataExpression',
      'dataDeclarationExpression',
    ],
  },
  image: {
    styles: ['alignLeft', 'alignCenter', 'alignRight'],
    toolbar: [
      'imageStyle:alignLeft',
      'imageStyle:alignCenter',
      'imageStyle:alignRight',
      '|',
      'imageTextAlternative',
      '|',
      'imageResize',
    ],
    upload: {
      panel: {
        items: ['insertImageViaUrl'],
      },
    },
  },
  table: {
    contentToolbar: [
      'tableColumn',
      'tableRow',
      'mergeTableCells',
      'tableProperties',
      'tableCellProperties',
    ],
  },
  // This value must be kept in sync with the language defined in webpack.config.js.
  language: 'en',
};
