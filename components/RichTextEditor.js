import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import css from '@styled-system/css';
import { v4 as uuid } from 'uuid';
import { isURL } from 'validator';

import { uploadImageWithXHR } from '../lib/api';
import MessageBox from './MessageBox';
import LoadingPlaceholder from './LoadingPlaceholder';
import HTMLContent from './HTMLContent';

const TrixEditorContainer = styled.div`
  ${props =>
    props.withBorders &&
    css({
      border: '1px solid',
      borderColor: 'black.300',
      borderRadius: 10,
      padding: 3,
    })}

  trix-editor {
    border: none;
    padding: 0;
    margin-top: 8px;
    padding-top: 8px;
    outline-offset: 0.5em;

    // Outline (only when there's no border)
    ${props =>
      !props.withBorders &&
      css({
        outline: !props.error ? 'none' : `1px dashed ${props.theme.colors.red[300]}`,
        '&:focus': {
          outline: `1px dashed ${props.theme.colors.black[200]}`,
        },
      })}

    // Placeholder
    &:empty:not(:focus)::before {
      color: ${props => props.theme.colors.black[400]};
    }

    // Image captions are disabled
    figcaption {
      display: none;
    }

    ${props => css({ minHeight: props.editorMinHeight })}
  }

  trix-toolbar {
    min-height: 40px;
    background: ${props => props.toolbarBackgroundColor};
    box-shadow: 0px 5px 3px -3px rgba(0, 0, 0, 0.1);
    z-index: 2;
    margin-bottom: 8px;

    .trix-button-group {
      border-radius: 6px;
      border-color: #c4c7cc;
      margin-bottom: 0;
      background: white;
    }

    .trix-button {
      border-bottom: none;
      display: inline-block;
      height: auto;

      &:hover {
        background: ${props => props.theme.colors.blue[100]};
      }

      &.trix-active {
        background: ${props => props.theme.colors.blue[200]};
      }

      &::before,
      &.trix-active::before {
        margin: 4px; // Use this to reduce the icons size
      }
    }

    /** Hide some buttons on mobile */
    @media (max-width: 500px) {
      .trix-button--icon-strike,
      .trix-button--icon-number-list,
      .trix-button--icon-decrease-nesting-level,
      .trix-button--icon-increase-nesting-level {
        display: none;
      }
    }

    /** Sticky mode */
    ${props =>
      props.withStickyToolbar &&
      css({
        position: 'sticky',
        top: props.toolbarTop || 0,
        marginTop: props.toolbarOffsetY,
        py: '10px',
      })}

    /** Custom icons */
    .trix-button--icon-attach::before {
      // See https://feathericons.com/?query=image
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E");
    }
  } // End of toolbar customization

  /** Disabled mode */
  ${props =>
    props.isDisabled &&
    css({
      pointerEvents: 'none',
      cursor: 'not-allowed',
      background: '#f3f3f3',
      'trix-toolbar': {
        background: '#f3f3f3',
      },
    })}
`;

/**
 * A React wrapper around the Trix library to edit rich text.
 * Produces HTML and clear text.
 */
export default class RichTextEditor extends React.Component {
  static propTypes = {
    /** If not provided, an id will be automatically generated which will require a component update */
    id: PropTypes.string,
    defaultValue: PropTypes.string,
    placeholder: PropTypes.string,
    toolbarBackgroundColor: PropTypes.string.isRequired,
    /** Font size for the text */
    fontSize: PropTypes.string,
    autoFocus: PropTypes.bool,
    /** Called when text is changed with html content as first param and text content as second param */
    onChange: PropTypes.func,
    /** A name for the input */
    inputName: PropTypes.string,
    /** Change this prop to reset the value */
    reset: PropTypes.any,
    /** @deprecated A ref for the input. Useful to plug react-hook-form */
    inputRef: PropTypes.func,
    /** Wether the toolbar should stick to the top */
    withStickyToolbar: PropTypes.bool,
    /** This component is borderless by default. Set this to `true` to change that. */
    withBorders: PropTypes.bool,
    /** Wether the field should be disabled */
    disabled: PropTypes.bool,
    /** If position is sticky, this prop defines the `top` property. Support responsive arrays */
    toolbarTop: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.array]),
    /** Usefull to compensate the height of the toolbar when editing inline */
    toolbarOffsetY: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.array]),
    /** Min height for the full component */
    editorMinHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.array]),
    /** If truthy, will display a red outline */
    error: PropTypes.any,
  };

  static defaultProps = {
    withStickyToolbar: false,
    toolbarTop: 0,
    toolbarOffsetY: -62, // Default Trix toolbar height
    inputName: 'content',
    toolbarBackgroundColor: 'white',
  };

  constructor(props) {
    super(props);
    this.editorRef = React.createRef();
    this.state = { id: props.id, error: null };
    this.isReady = false;

    if (typeof window !== 'undefined') {
      this.Trix = require('trix');
      this.Trix.config.blockAttributes.heading1 = { tagName: 'h3' };
      this.Trix.config.attachments.preview.caption = { name: false, size: false };
    }
  }

  componentDidMount() {
    if (!this.state.id) {
      this.setState({ id: uuid() });
    } else if (!this.isReady) {
      this.initialize();
    }
  }

  componentDidUpdate(oldProps) {
    if (!this.isReady) {
      this.initialize();
    } else if (oldProps.reset !== this.props.reset) {
      this.editorRef.current.editor.loadHTML('');
    }
  }

  componentWillUnmount() {
    if (this.isReady) {
      this.editorRef.current.removeEventListener('trix-change', this.handleChange);
      this.editorRef.current.removeEventListener('trix-attachment-add', this.handleUpload);
      this.editorRef.current.removeEventListener('trix-attachment-add', this.handleFileAccept);
    }
  }

  getEditor() {
    return this.editorRef.current.editor;
  }

  initialize = () => {
    if (this.Trix && this.editorRef.current) {
      // Listen for changes
      this.editorRef.current.addEventListener('trix-change', this.handleChange, false);
      this.editorRef.current.addEventListener('trix-attachment-add', this.handleUpload);
      this.editorRef.current.addEventListener('trix-file-accept', this.handleFileAccept);

      // Component ready!
      this.isReady = true;
    }
  };

  /** ---- Trix handlers ---- */

  handleChange = e => {
    // Trigger content formatters
    this.autolink();

    // Notify parent function
    if (this.props.onChange) {
      this.props.onChange(e);
    }

    // Reset errors
    if (this.state.error) {
      this.setState({ error: null });
    }
  };

  handleFileAccept = e => {
    if (!/^image\//.test(e.file.type)) {
      alert('You can only upload images.');
      e.preventDefault();
    } else if (e.file.size > 4000000) {
      // Prevent attaching files > 4MB
      alert('This file is too big (max: 4mb).');
      e.preventDefault();
    }
  };

  handleUpload = e => {
    const { attachment } = e;
    if (!attachment.file) {
      return;
    }

    const onProgress = progress => attachment.setUploadProgress(progress);
    const onSuccess = fileURL => attachment.setAttributes({ url: fileURL, href: fileURL });
    const onFailure = () => this.setState({ error: 'File upload failed' });
    uploadImageWithXHR(attachment.file, { onProgress, onSuccess, onFailure });
    return e;
  };

  /** Automatically create anchors with hrefs for links */
  autolink() {
    const linkRegex = new RegExp(`(https?://\\S+\\.\\S+)\\s`, 'ig');
    const editor = this.getEditor();
    const content = editor.getDocument().toString();
    let match;
    while ((match = linkRegex.exec(content))) {
      const url = match[1];
      if (isURL(url)) {
        const position = match.index;
        const url_length = this.autolink_delim(url);
        const range = [position, position + url_length];
        const hrefAtRange = editor.getDocument().getCommonAttributesAtRange(range).href;
        if (hrefAtRange !== url) {
          this.updateInRange(editor, range, 0, () => {
            if (editor.canActivateAttribute('href')) {
              editor.activateAttribute('href', url);
            }
          });
        }
      }
    }
  }

  /** A helper used by autolink to find where the url actually ends */
  autolink_delim = url => {
    let link_end = url.length;

    while (link_end > 0) {
      const cclose = url[link_end - 1];

      let copen;
      switch (cclose) {
        case '"':
          copen = '"';
          break;
        case "'":
          copen = "'";
          break;
        case ')':
          copen = '(';
          break;
        case ']':
          copen = '[';
          break;
        case '}':
          copen = '{';
          break;
      }

      if ('?!.,:;*_~\'"'.includes(url[link_end - 1])) {
        link_end--;
      } else if (copen) {
        let unclosed = 0;

        for (let i = 0; i < link_end; i++) {
          if (url[i] === copen) {
            unclosed++;
          } else if (url[i] === cclose) {
            unclosed--;
          }
        }

        if (unclosed >= 0) {
          break;
        }
        link_end--;
      } else {
        break;
      }
    }

    return link_end;
  };

  /** A trix helper that will apply func in range then restore base range when it's done */
  updateInRange(editor, range, offset = 0, updateFunc) {
    const baseRange = editor.getSelectedRange();
    editor.setSelectedRange(range);
    updateFunc();
    editor.setSelectedRange([baseRange[0] + offset, baseRange[1] + offset]);
  }

  /** ---- Render ---- */

  render() {
    const {
      defaultValue,
      withStickyToolbar,
      toolbarTop,
      toolbarOffsetY,
      toolbarBackgroundColor,
      autoFocus,
      placeholder,
      editorMinHeight,
      withBorders,
      inputName,
      inputRef,
      disabled,
      error,
      fontSize,
    } = this.props;
    return !this.state.id ? (
      <LoadingPlaceholder height={editorMinHeight ? editorMinHeight + 56 : 200} />
    ) : (
      <TrixEditorContainer
        withStickyToolbar={withStickyToolbar}
        toolbarTop={toolbarTop}
        toolbarOffsetY={toolbarOffsetY}
        toolbarBackgroundColor={toolbarBackgroundColor}
        editorMinHeight={editorMinHeight}
        withBorders={withBorders}
        isDisabled={disabled}
        error={error}
        data-cy="RichTextEditor"
      >
        {this.state.error && (
          <MessageBox type="error" withIcon>
            {this.state.error.toString()}
          </MessageBox>
        )}
        <input id={this.state.id} value={defaultValue} type="hidden" name={inputName} ref={inputRef} />
        <HTMLContent fontSize={fontSize}>
          <trix-editor
            ref={this.editorRef}
            input={this.state.id}
            autofocus={autoFocus ? true : undefined}
            placeholder={placeholder}
          />
        </HTMLContent>
      </TrixEditorContainer>
    );
  }
}
