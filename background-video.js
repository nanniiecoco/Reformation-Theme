/**
 *  @class
 *  @function BackgroundVideo
 */
if (!customElements.get('background-video')) {
	class BackgroundVideo extends HTMLElement {
	  constructor() {
			super();

			this.tl = null;
			this.splittext = null;
			this._observer = null;
	  }
		connectedCallback() {
			if (document.body.classList.contains('animations-true') && typeof gsap !== 'undefined') {
				this.prepareAnimations();
			}
			this.observeVideo();
		}
		observeVideo() {
			var video_container = this.querySelector('.background-video__iframe');
			if (!video_container) return;

			var template = video_container.querySelector('.background-video__deferred');
			if (!template) return;

			var self = this;
			this._observer = new IntersectionObserver(function(entries) {
				if (entries[0].isIntersecting) {
					self._observer.disconnect();
					self._observer = null;
					template.replaceWith(template.content.cloneNode(true));
				}
			}, { rootMargin: '100px' });

			this._observer.observe(this);
		}
		disconnectedCallback() {
			if (this._observer) {
				this._observer.disconnect();
				this._observer = null;
			}
			if (this.tl) {
				this.tl.kill();
				this.tl = null;
			}
			if (this.splittext) {
				this.splittext.revert();
				this.splittext = null;
			}
		}
		prepareAnimations() {
			let section = this,
					button_offset = 0;

			section.tl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top center"
				}
			});

			document.fonts.ready.then(function() {
				section.splittext = new SplitText(section.querySelectorAll('h3, p'), {
						type: 'lines, words',
						linesClass: 'line-child'
					}
				);

				if (section.querySelector('h3')) {
					let h3_duration = 0.7 + ((section.querySelectorAll('h3 .line-child div').length - 1) * 0.05);
					section.tl
						.from(section.querySelectorAll('h3 .line-child div'), {
							duration: h3_duration,
							yPercent: '100',
							stagger: 0.05
						}, 0);
					button_offset += h3_duration;
				}
				if (section.querySelector('p')) {
					let p_duration = 0.7 + ((section.querySelectorAll('p .line-child div').length - 1) * 0.02);
					section.tl
						.from(section.querySelectorAll('p .line-child div'), {
							duration: p_duration,
							yPercent: '100',
							stagger: 0.02
						}, 0);
					button_offset += p_duration;
				}
				if (section.querySelector('.video-lightbox-modal__button')) {
					section.tl
						.fromTo(section.querySelector('.video-lightbox-modal__button'), {
							autoAlpha: 0
						}, {
							duration: 0.5,
							autoAlpha: 1
						}, button_offset * 0.4);
				}

			});
		}
	}
	customElements.define('background-video', BackgroundVideo);
}
