/**
 * jsdom lacks the Popover API that the Forge V2 overlays use. Model it minimally so a popover
 * is visible only between showPopover() and hidePopover(), as in a real browser.
 */
const proto = HTMLElement.prototype as HTMLElement & {
  showPopover?: () => void;
  hidePopover?: () => void;
};

if (typeof proto.showPopover !== 'function') {
  proto.showPopover = function showPopover(this: HTMLElement) {
    this.setAttribute('data-popover-open', 'true');
  };
  proto.hidePopover = function hidePopover(this: HTMLElement) {
    this.removeAttribute('data-popover-open');
  };
}

const style = document.createElement('style');
style.textContent =
  '[popover]:not([data-popover-open]){display:none!important}[popover][data-popover-open]{display:block!important}';
document.head.appendChild(style);

// jsdom's <dialog> has no showModal/close; DialogV2 opens through them.
const dialogProto = HTMLDialogElement.prototype as HTMLDialogElement & {
  showModal?: () => void;
  close?: () => void;
};
if (typeof dialogProto.showModal !== 'function') {
  dialogProto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
}
if (typeof dialogProto.close !== 'function') {
  dialogProto.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
