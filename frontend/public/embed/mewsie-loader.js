/**
 * mewsie-loader.js — Iframe embed loader for Base (Omniboost main product).
 *
 * Drop this script into Base's codebase. Call MewsieEmbed.init() with the
 * current user's context. The loader creates a positioned iframe that loads
 * the Mewsie chat widget with all context passed via URL params.
 *
 * Usage:
 *   <script src="https://mewsie.omniboost.io/embed/mewsie-loader.js"></script>
 *   <script>
 *     MewsieEmbed.init({
 *       baseUserId: currentUser.id,           // required
 *       accountingSoftware: currentUser.tool,  // e.g. "Xero", "QuickBooks"
 *       tier: currentUser.tier,               // "bronze" | "silver" | "gold"
 *       companyName: currentUser.company,
 *     });
 *   </script>
 *
 * Configuration:
 *   Set window.MEWSIE_URL before loading this script to override the
 *   default Mewsie URL. Example:
 *     window.MEWSIE_URL = 'https://staging-mewsie.omniboost.io';
 */
(function (window, document) {
  'use strict';

  var DEFAULT_URL = 'https://998afrnq3y.eu-west-1.awsapprunner.com';
  var CONTAINER_ID = 'mewsie-embed-container';

  var state = {
    initialized: false,
    open: false,
    config: null
  };

  function getMewsieUrl() {
    return window.MEWSIE_URL || DEFAULT_URL;
  }

  function buildIframeUrl(config) {
    var base = getMewsieUrl();
    var params = [];
    if (config.baseUserId) params.push('baseUserId=' + encodeURIComponent(config.baseUserId));
    if (config.accountingSoftware) params.push('as=' + encodeURIComponent(config.accountingSoftware));
    if (config.tier) params.push('tier=' + encodeURIComponent(config.tier));
    if (config.companyName) params.push('company=' + encodeURIComponent(config.companyName));
    return base + (params.length > 0 ? '?' + params.join('&') : '');
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '#' + CONTAINER_ID + ' {',
      '  position: fixed;',
      '  bottom: 20px;',
      '  right: 20px;',
      '  z-index: 999999;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
      '}',
      '#mewsie-embed-toggle {',
      '  width: 56px;',
      '  height: 56px;',
      '  border-radius: 50%;',
      '  background: #3B82F6;',
      '  border: none;',
      '  cursor: pointer;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  box-shadow: 0 4px 12px rgba(0,0,0,0.15);',
      '  transition: transform 0.2s, box-shadow 0.2s;',
      '}',
      '#mewsie-embed-toggle:hover {',
      '  transform: scale(1.05);',
      '  box-shadow: 0 6px 16px rgba(0,0,0,0.2);',
      '}',
      '#mewsie-embed-toggle svg {',
      '  width: 28px;',
      '  height: 28px;',
      '  fill: white;',
      '}',
      '#mewsie-embed-frame {',
      '  display: none;',
      '  width: 400px;',
      '  height: 600px;',
      '  max-height: calc(100vh - 100px);',
      '  border: none;',
      '  border-radius: 12px;',
      '  box-shadow: 0 8px 32px rgba(0,0,0,0.12);',
      '  margin-bottom: 12px;',
      '  background: white;',
      '}',
      '#mewsie-embed-frame.mewsie-open {',
      '  display: block;',
      '}',
      '@media (max-width: 480px) {',
      '  #mewsie-embed-frame {',
      '    width: calc(100vw - 24px);',
      '    height: calc(100vh - 100px);',
      '    right: 12px;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function createWidget(config) {
    injectStyles();

    var container = document.createElement('div');
    container.id = CONTAINER_ID;

    // Iframe
    var iframe = document.createElement('iframe');
    iframe.id = 'mewsie-embed-frame';
    iframe.src = buildIframeUrl(config);
    iframe.title = 'Mewsie Support Chat';
    iframe.allow = 'clipboard-write';

    // Toggle button
    var toggle = document.createElement('button');
    toggle.id = 'mewsie-embed-toggle';
    toggle.title = 'Chat with Mewsie';
    toggle.setAttribute('aria-label', 'Open Mewsie chat');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>' +
      '</svg>';
    toggle.addEventListener('click', function () {
      if (state.open) {
        window.MewsieEmbed.close();
      } else {
        window.MewsieEmbed.open();
      }
    });

    container.appendChild(iframe);
    container.appendChild(toggle);
    document.body.appendChild(container);
  }

  window.MewsieEmbed = {
    /**
     * Initialize the Mewsie widget with user context from Base.
     *
     * @param {Object}  config
     * @param {string}  config.baseUserId          - Required. Unique user ID from Base.
     * @param {string}  [config.accountingSoftware] - e.g. "Xero", "QuickBooks", "Exact Online"
     * @param {string}  [config.tier]               - "bronze" | "silver" | "gold"
     * @param {string}  [config.companyName]        - Company name
     */
    init: function (config) {
      if (state.initialized) {
        console.warn('[MewsieEmbed] Already initialized');
        return;
      }
      if (!config || !config.baseUserId) {
        console.error('[MewsieEmbed] init() requires config.baseUserId');
        return;
      }
      state.config = config;
      state.initialized = true;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          createWidget(config);
        });
      } else {
        createWidget(config);
      }
    },

    /** Show the chat iframe. */
    open: function () {
      var frame = document.getElementById('mewsie-embed-frame');
      if (frame) {
        frame.classList.add('mewsie-open');
        state.open = true;
      }
    },

    /** Hide the chat iframe. */
    close: function () {
      var frame = document.getElementById('mewsie-embed-frame');
      if (frame) {
        frame.classList.remove('mewsie-open');
        state.open = false;
      }
    },

    /** Remove the widget entirely from the page. */
    destroy: function () {
      var container = document.getElementById(CONTAINER_ID);
      if (container) container.remove();
      state.initialized = false;
      state.open = false;
      state.config = null;
    }
  };
})(window, document);
