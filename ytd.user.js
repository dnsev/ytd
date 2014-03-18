// ==UserScript==
// @name        YouTube Playlist Deleted Video Name Recovery
// @description Recover (partial) names of YouTube videos which have been deleted
// @namespace   dnsev
// @include     *://*youtube.com/*
// @version     1.3
// @grant       none
// @icon        data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB+UlEQVR42u3XvWtTURgG8Hdqb3LzeWv9ABFUjCj+CU79BwQplA4uUjpYQQcdOhYcjSJasVpKC0UDhYigpKCxlNTWkA52SJWADYHbijdDMiTChcLjc+ES6mcPTehZOvyeA+fA877rEQBaHSwgBcvUSv8CeYbvOmVp1VchdEhlR2+aLpJ45COD0oR9liKRZcvsJ2jSL7m4mSJokpLFeDBP0CQv7+NBm6Bq8fhh7+wUW97Gg9sEFdljPfixtYnGxlcUb4wgeyTm3bdjW+ZjQajKXkjAdd2WxrctrI/exrsTR733PZE3DGXnE2g0Gr9oNpuob9pYu3UTmd6YepdPXjGUnTuDWq32V/V6Hd8/r2PlyqB6H0maoYwLOI7zX9VqFV+ez+JlT1ipU+aiASg7exq2be8qNz2FOSuk1CkphjIuUC6X/+nT8gckL1/CqNmFF4qdMstQljiFUqn0h7VCAeNDVzESNZEMG+p9JDMMZYmTKBaLLYWlJTzi4Gu9Fu6EujGt3tUiU5GAS1AxcSiGlYUF5OYzuDs4gOGIiTGzG0+9971x5VkkUCGomKBhK4qhQBfGQgYH8749G/IkEsgRVI17Z+fk5HHEmCRoMikPw0YfQZM+eRA2PEnCPkuSyH2Gb4Be0+oODqFNzm+dGX+WeOQeQx/9Cxz8DfUv8BPC7tqgW88FVAAAAABJRU5ErkJggg==
// @updateURL   https://raw.github.com/dnsev/ytd/master/ytd.user.js
// @downloadURL https://raw.github.com/dnsev/ytd/master/ytd.user.js
// ==/UserScript==



(function () {
	"use strict";



	var E = function (tag) {
		var el = document.createElement(tag);
		if (arguments.length > 1) {
			tag = "";
			for (var i = 1; i < arguments.length; ++i) {
				if (i > 1) tag += " ";
				tag += arguments[i];
			}
			el.className = tag;
		}
		return el;
	};



	var Ready = (function () {

		// Event callbacks
		var on_document_readystatechange_interval = null;
		var on_ready = null;
		var on_document_readystatechange = function () {
			// State check
			if (document.readyState == "interactive" || document.readyState == "complete") {
				// Clear
				clear_load_events();
				var on_ready2 = on_ready;
				on_ready = null;
				// Call ready
				if (on_ready2 instanceof Function) on_ready2.call(null);
				return true;
			}
			return false;
		};
		var on_document_load = function () {
			// Clear
			clear_load_events();
			var on_ready2 = on_ready;
			on_ready = null;
			// Call ready
			if (on_ready2 instanceof Function) on_ready2.call(null);
		};

		// Setup events
		var setup_load_events = function (callback) {
			// Setup events
			on_ready = callback;
			if (on_document_readystatechange_interval === null) {
				if (on_document_readystatechange() === false) {
					document.addEventListener("readystatechange", on_document_readystatechange, false);
					document.addEventListener("load", on_document_load, false);
					on_document_readystatechange_interval = setInterval(on_document_readystatechange, 20);
				}
			}
		};

		// Clear events
		var clear_load_events = function () {
			if (on_document_readystatechange_interval !== null) {
				// Remove timer
				clearInterval(on_document_readystatechange_interval);
				on_document_readystatechange_interval = null;

				// Remove events
				document.removeEventListener("readystatechange", on_document_readystatechange, false);
				document.removeEventListener("load", on_document_load, false);
				clearInterval(on_document_readystatechange_interval);
			}
		};

		// Return function
		return setup_load_events;

	})();



	var Fixer = (function () {

		var Fixer = function () {
			this.queue = [];
			this.running = false;
			this.timeout = 0.0;
			this.timeout_timer = null;
		};

		var run = function () {
			// Run?
			if (this.running || this.queue.length == 0) return;
			this.running = true;

			// Create url
			var url = "/watch?v=" + this.queue[0].video_id;

			// Create request
			var xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			xhr.responseType = "document";

			// Error
			xhr.addEventListener("error", run_error.bind(this, xhr, "error"), false);
			// Abort
			xhr.addEventListener("abort", run_error.bind(this, xhr, "abort"), false);
			// Complete
			xhr.addEventListener("load", run_success.bind(this, xhr, "load"), false);

			// Start request
			xhr.send();
		};

		var run_error = function (xhr, reason) {
			// Error
			run_place_error.call(this, true, reason);

			// Next
			run_complete.call(this);
		};
		var run_success = function (xhr, reason) {
			// Get data
			var data = xhr.response;

			// Find video name
			var errorMessage = data.querySelector("#unavailable-message");
			if (errorMessage) {
				var m = /"(.+?)"/.exec(errorMessage.textContent || "");
				if (m) {
					// Show text
					var search_term = m[1].replace(/\.\.\.$/, "").trim();
					var link = E("a");
					link.setAttribute("target", "_blank");
					link.setAttribute("href", "/results?search_query=" + encodeURIComponent(search_term));
					link.textContent = m[1];
					run_place_links.call(this, link);
				}
				else {
					// Error
					run_place_error.call(this, false);
				}
			}

			// Next
			run_complete.call(this);
		};
		var run_place_error = function (ajax_error, ajax_error_message) {
			// Add an error
			var link = E("a");
			link.textContent = (ajax_error ? "Ajax error" + (ajax_error_message ? ": " + ajax_error_message : "") : "No results");
			run_place_links.call(this, link);
		};
		var run_place_links = function (element) {
			// Add links
			var div = E("div", "cyt-unavailable-video-name cyt-error");

			// Element
			div.appendChild(element);

			// Separator
			div.appendChild(E("span"));

			// Link
			var link = E("a");
			link.setAttribute("target", "_blank");
			link.setAttribute("href", "https://www.google.com/#q=" + encodeURIComponent("YouTube \"" + this.queue[0].video_id + "\"") + "&safe=off");
			link.textContent = "google";
			div.appendChild(link);

			// Add to document
			var par = this.queue[0].element.parentNode;
			if (par != null) {
				var s = this.queue[0].element.nextSibling;
				if (s == null) {
					par.appendChild(div);
				}
				else {
					par.insertBefore(div, s);
				}
			}
		};
		var run_complete = function () {
			// Run next queue item
			var self = this;
			this.queue.shift();
			this.timeout_timer = setTimeout(function () {
				// Run
				self.timeout_timer = null;
				self.running = false;
				run.call(self);
			}, this.timeout * 1000);
		};


		Fixer.prototype = {
			constructor: Fixer,

			add: function (element) {
				var queue_item = {
					element: element,
					video_id: null,
				};

				var m = /\?(?:.+?\&)?v=([^\&]+)/.exec(element.getAttribute("href"));
				if (m) queue_item.video_id = m[1];

				this.queue.push(queue_item);

				// Start if not running
				run.call(this);
			}

		};


		return Fixer;

	})();



	var main = function () {
		// Insert stylesheet
		var head = document.querySelector("head");
		if (head) {
			var style = E("style");
			style.innerHTML =
				'.cyt-unavailable-video-name{color:#2793e6;font-weight:bold;display:block;margin-top:4px;}\
				.cyt-unavailable-video-name>a{color:#e69327;text-decoration:none;}\
				.cyt-unavailable-video-name>a:hover{text-decoration:underline;}\
				.cyt-unavailable-video-name.cyt-error>a:not([href]){color:#777777;text-decoration:none;cursor:default;}\
				.cyt-unavailable-video-name>span:before{content:"/";margin:0px 4px;}\
				';
			head.appendChild(style);
		}

		// Find titles
		var titles = document.querySelectorAll(".pl-video-title-link");
		var deleteds = [];
		for (var i = 0; i < titles.length; ++i) {
			if ((titles[i].textContent || "").trim().toLowerCase() == "[deleted video]") {
				deleteds.push(titles[i]);
			}
		}

		// Fix deleteds
		if (deleteds.length > 0) {
			var fixer = new Fixer();
			for (var i = 0; i < deleteds.length; ++i) {
				fixer.add(deleteds[i]);
			}
		}
	};



	// Init
	Ready(function () {
		// Check url
		if (/^https?:\/\/(?:.+?\.)?youtube\.com\/playlist\?(?:(?:.+?\&)?list=([^\&]+))/i.test(document.location.href)) {
			main();
		}
	});

})();


