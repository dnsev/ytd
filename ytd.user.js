// ==UserScript==
// @name        YouTube Playlist Deleted Video Name Recovery
// @description Recover (partial) names of YouTube videos which have been deleted
// @namespace   dnsev
// @include     *://*youtube.com/*
// @version     1.2
// @grant       none
// @require     https://raw.github.com/dnsev/ytd/master/jquery.js
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
		return $(el);
	};



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
			var self = this;

			// Start
			$.ajax({
				type: "GET",
				url: "/watch?v=" + this.queue[0].video_id,
				dataType: "html",
				error: function (jqXHR, textStatus, errorThrown) {
					run_error.call(self, jqXHR, textStatus, errorThrown);
				},
				success: function (data, textStatus, jqXHR) {
					run_success.call(self, data, textStatus, jqXHR);
				}
			});
		};

		var run_error = function (jqXHR, textStatus, errorThrown) {
			// Error
			run_place_error.call(this, true, textStatus);

			// Next
			run_complete.call(this);
		};
		var run_success = function (data, textStatus, jqXHR) {
			// Find video name
			var errorMessage = $(data).find("#unavailable-message");
			if (errorMessage.length > 0) {
				var m = /"(.+?)"/.exec(errorMessage.text());
				if (m) {
					var search_term = m[1].replace(/\.\.\.$/, "").trim();
					// Show text
					run_place_links.call(this,
						E("a")
						.attr("target", "_blank")
						.attr("href", "/results?search_query=" + encodeURIComponent(search_term))
						.text(m[1])
					);
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
			run_place_links.call(this,
				E("a")
				.text(ajax_error ? "Ajax error" + (ajax_error_message ? ": " + ajax_error_message : "") : "No results")
			);
		};
		var run_place_links = function (element) {
			// Add links
			this.queue[0].element.parent().parent().after(
				E("div", "cyt-unavailable-video-name cyt-error")
				.append(element)
				.append(E("span"))
				.append(
					E("a")
					.attr("target", "_blank")
					.attr("href", "https://www.google.com/#q=" + encodeURIComponent("YouTube \"" + this.queue[0].video_id + "\"") + "&safe=off")
					.text("google")
				)
			);
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

				var m = /\?(?:.+?\&)?v=([^\&]+)/.exec(element.parent().attr("href"));
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
		$("head").append(
			E("style")
			.html(
				'.cyt-unavailable-video-name{color:#2793e6;font-weight:bold;display:block;margin-top:4px;}' +
				'.cyt-unavailable-video-name>a{color:#e69327;text-decoration:none;}' +
				'.cyt-unavailable-video-name>a:hover{text-decoration:underline;}' +
				'.cyt-unavailable-video-name.cyt-error>a:not([href]){color:#777777;text-decoration:none;cursor:default;}' +
				'.cyt-unavailable-video-name>span:before{content:"/";margin:0px 4px;}' +
				''
			)
		);

		// Find titles
		var titles = $(".title.video-title");
		var deleteds = [];
		for (var i = 0; i < titles.length; ++i) {
			var title = $(titles[i]);
			if (title.text().trim().toLowerCase() == "[deleted video]") {
				deleteds.push(title);
			}
		}

		// Fix deleteds
		var fixer = new Fixer();
		for (var i = 0; i < deleteds.length; ++i) {
			fixer.add(deleteds[i]);
		}
	};



	// Init
	$(document).ready(function () {
		if (/^https?:\/\/(?:.+?\.)?youtube\.com\/playlist\?(?:(?:.+?\&)?list=([^\&]+))/i.test(document.location.href)) {
			main();
		}
	});

})();


