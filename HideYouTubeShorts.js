// ==UserScript==
// @name         YouTube: Hide Shorts Videos from subscription
// @license      MIT
// @description  Hides sharts videos from your YouTube subscriptions page
// @author       Francesco Fattori
// @match        https://*.youtube.com/*
// @match        https://youtube.com/*
// ==/UserScript==

(function (_undefined) {

	// Enable for debugging
	const DEBUG = false;

	// Set defaults
	localStorage.YTHWV_WATCHED = localStorage.YTHWV_WATCHED || 'false';

	const logDebug = (msg) => {
		// eslint-disable-next-line no-console
		if (DEBUG) console.log(msg);
	};

	// GreaseMonkey no longer supports GM_addStyle. So we have to define
	// our own polyfill here
	const addStyle = function (aCss) {
		const head = document.getElementsByTagName('head')[0];
		if (head) {
			const style = document.createElement('style');
			style.setAttribute('type', 'text/css');
			style.textContent = aCss;
			head.appendChild(style);
			return style;
		}
		return null;
	};

	addStyle(`
.YT-HWV-WATCHED-HIDDEN { display: none !important }
.YT-HWV-WATCHED-DIMMED { opacity: 0.3 }
.YT-HWV-HIDDEN-ROW-PARENT { padding-bottom: 10px }
.YT-HWV-BUTTON {
	background: transparent;
	border: 0;
	color: rgb(96,96,96);
	cursor: pointer;
	height: 40px;
	outline: 0;
	margin-right: 8px;
	padding: 0 8px;
	width: 40px;
}
html[dark]         .YT-HWV-BUTTON,  /* "Dark" theme support */
ytd-masthead[dark] .YT-HWV-BUTTON   /* In "Theater mode" the top bar containing the button is always dark regardless of "Dark theme" */
{
	color: #EFEFEF;
}
.YT-HWV-BUTTON svg {
	height: 24px;
	width: 24px;
}
.YT-HWV-MENU {
	background: #F8F8F8;
	border: 1px solid #D3D3D3;
	box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
	display: none;
	font-size: 12px;
	margin-top: -1px;
	padding: 10px;
	position: absolute;
	right: 0;
	text-align: center;
	top: 100%;
	white-space: normal;
	z-index: 9999;
}
.YT-HWV-MENU-ON { display: block; }
.YT-HWV-MENUBUTTON-ON span { transform: rotate(180deg) }
`);

	/* eslint-disable max-len */
	const icons = {
		dimmed: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor" fill-opacity="0.3"><path d="M24 9C14 9 5.46 15.22 2 24c3.46 8.78 12 15 22 15 10.01 0 18.54-6.22 22-15-3.46-8.78-11.99-15-22-15zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></g></svg>',
		hidden: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor" fill-opacity="0.3"><path d="M24 14c5.52 0 10 4.48 10 10 0 1.29-.26 2.52-.71 3.65l5.85 5.85c3.02-2.52 5.4-5.78 6.87-9.5-3.47-8.78-12-15-22.01-15-2.8 0-5.48.5-7.97 1.4l4.32 4.31c1.13-.44 2.36-.71 3.65-.71zM4 8.55l4.56 4.56.91.91C6.17 16.6 3.56 20.03 2 24c3.46 8.78 12 15 22 15 3.1 0 6.06-.6 8.77-1.69l.85.85L39.45 44 42 41.46 6.55 6 4 8.55zM15.06 19.6l3.09 3.09c-.09.43-.15.86-.15 1.31 0 3.31 2.69 6 6 6 .45 0 .88-.06 1.3-.15l3.09 3.09C27.06 33.6 25.58 34 24 34c-5.52 0-10-4.48-10-10 0-1.58.4-3.06 1.06-4.4zm8.61-1.57l6.3 6.3L30 24c0-3.31-2.69-6-6-6l-.33.03z"/></g></svg>',
		normal: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor"><path d="M24 9C14 9 5.46 15.22 2 24c3.46 8.78 12 15 22 15 10.01 0 18.54-6.22 22-15-3.46-8.78-11.99-15-22-15zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></g></svg>',
	};
	/* eslint-enable max-len */

	// ===========================================================

	const debounce = function (func, wait, immediate) {
		let timeout;
		return (...args) => {
			const later = () => {
				timeout = null;
				if (!immediate) func.apply(this, args);
			};
			const callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(this, args);
		};
	};

	// ===========================================================

	const findWatchedElements = function () {
		return document.querySelectorAll('a.ytd-thumbnail[href*="/shorts"]');
	};

	// ===========================================================

	const findButtonTarget = function () {
		// Button will be injected into the main header menu
		return document.querySelector('#container #end #buttons');
	};

	// ===========================================================

	const isButtonAlreadyThere = function () {
		return document.querySelectorAll('.YT-HWV-BUTTON').length > 0;
	};

	// ===========================================================



	// ===========================================================

	const updateClassOnWatchedItems = function () {

		// Remove existing classes
		document.querySelectorAll('.YT-HWV-WATCHED-DIMMED').forEach((el) => el.classList.remove('YT-HWV-WATCHED-DIMMED'));
		document.querySelectorAll('.YT-HWV-WATCHED-HIDDEN').forEach((el) => el.classList.remove('YT-HWV-WATCHED-HIDDEN'));

		// If we're on the History page -- do nothing. We don't want to hide
		// watched videos here.
		if (window.location.href.indexOf('/feed/subscriptions') == -1) return;

		const state = localStorage[`YTHWV_STATE`];


		findWatchedElements().forEach((item, _i) => {
			let watchedItem;
			let dimmedItem;

			
            // For rows, hide the row and the header too. We can't hide
            // their entire parent because then we'll get the infinite
            // page loader to load forever.
            watchedItem = (
                // Grid item
                item.closest('.ytd-grid-renderer') ||
                item.closest('.ytd-item-section-renderer') ||
                // List item
                item.closest('#grid-container')
            );

            // If we're hiding the .ytd-item-section-renderer element, we need to give it
            // some extra spacing otherwise we'll get stuck in infinite page loading
            if (watchedItem && watchedItem.classList.contains('ytd-item-section-renderer')) {
                watchedItem.closest('ytd-item-section-renderer').classList.add('YT-HWV-HIDDEN-ROW-PARENT');
            }
			

			if (watchedItem) {
				// Add current class
				if (state === 'dimmed') {
					watchedItem.classList.add('YT-HWV-WATCHED-DIMMED');
				} else if (state === 'hidden') {
					watchedItem.classList.add('YT-HWV-WATCHED-HIDDEN');
				}
			}

			if (dimmedItem && (state === 'dimmed' || state === 'hidden')) {
				dimmedItem.classList.add('YT-HWV-WATCHED-DIMMED');
			}
		});
	};

	// ===========================================================

	const addButton = function () {
		if (isButtonAlreadyThere()) {
			setButtonState();
			return;
		}

		// Find button target
		const target = findButtonTarget();
		if (!target) return;

		// Generate button DOM
		const button = document.createElement('button');
		button.classList.add('YT-HWV-BUTTON');

		// Attach events
		button.addEventListener('click', () => {
			const state = localStorage[`YTHWV_STATE`];

			logDebug(`[YT-HWV] button clicked while state: ${state}`);

			let newState = 'hidden';
			if (state === 'hidden') {
				newState = 'normal';
			}

			localStorage[`YTHWV_STATE`] = newState;

			setButtonState();
			updateClassOnWatchedItems();
		});

		// Insert button into DOM
		target.parentNode.insertBefore(button, target);

		setButtonState();
	};

	const setButtonState = () => {
		const state = localStorage[`YTHWV_STATE`] || 'normal';
		const button = document.querySelector('.YT-HWV-BUTTON');
		if (!button) return;

		button.innerHTML = icons[state];
		button.setAttribute('title', `Toggle Watched Videos (currently "${state}")`);
	};

	const run = debounce((mutations) => {
		if (
			mutations && mutations.length === 1 &&
			mutations[0].target.classList.length === 1 &&
			mutations[0].target.classList[0] === 'YT-HWV-BUTTON'
		) {
			// don't react if only our own button changed its state
			// to avoid running an endless loop:
			return;
		}
		logDebug('[YT-HWV] Running check for watched videos');
		updateClassOnWatchedItems();
		addButton();
	}, 250);

	// ===========================================================

	// Hijack all XHR calls
	const send = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.send = function (data) {
		this.addEventListener('readystatechange', function () {
			if (
			// Anytime more videos are fetched -- re-run script
				this.responseURL.indexOf('browse_ajax?action_continuation') > 0
			) {
				setTimeout(() => {
					run();
				}, 0);
			}
		}, false);
		send.call(this, data);
	};

	// ===========================================================

	const observeDOM = (function () {
		const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		const eventListenerSupported = window.addEventListener;

		return function (obj, callback) {
			logDebug('[YT-HWV] Attaching DOM listener');

			// Invalid `obj` given
			if (!obj) return;

			if (MutationObserver) {
				const obs = new MutationObserver(((mutations, _observer) => {
					if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {

						callback(mutations);
					}
				}));

				obs.observe(obj, {childList: true, subtree: true});
			} else if (eventListenerSupported) {
				obj.addEventListener('DOMNodeInserted', callback, false);
				obj.addEventListener('DOMNodeRemoved', callback, false);
			}
		};
	}());

	// ===========================================================

	logDebug('[YT-HWV] Starting Script');

	// YouTube does navigation via history and also does a bunch
	// of AJAX video loading. In order to ensure we're always up
	// to date, we have to listen for ANY DOM change event, and
	// re-run our script.
	observeDOM(document.body, run);

	run();
}());
