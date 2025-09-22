// import { fetchPlaceholders } from '../../scripts/aem.js';

// function updateActiveSlide(slide) {
//   const block = slide.closest('.carousel');
//   const slideIndex = parseInt(slide.dataset.slideIndex, 10);
//   block.dataset.activeSlide = slideIndex;

//   const slides = block.querySelectorAll('.carousel-slide');

//   slides.forEach((aSlide, idx) => {
//     aSlide.setAttribute('aria-hidden', idx !== slideIndex);
//     aSlide.querySelectorAll('a').forEach((link) => {
//       if (idx !== slideIndex) {
//         link.setAttribute('tabindex', '-1');
//       } else {
//         link.removeAttribute('tabindex');
//       }
//     });
//   });

//   const indicators = block.querySelectorAll('.carousel-slide-indicator');
//   indicators.forEach((indicator, idx) => {
//     if (idx !== slideIndex) {
//       indicator.querySelector('button').removeAttribute('disabled');
//     } else {
//       indicator.querySelector('button').setAttribute('disabled', 'true');
//     }
//   });
// }

// export function showSlide(block, slideIndex = 0) {
//   const slides = block.querySelectorAll('.carousel-slide');
//   let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
//   if (slideIndex >= slides.length) realSlideIndex = 0;
//   const activeSlide = slides[realSlideIndex];

//   activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
//   block.querySelector('.carousel-slides').scrollTo({
//     top: 0,
//     left: activeSlide.offsetLeft,
//     behavior: 'smooth',
//   });
// }

// function bindEvents(block) {
//   const slideIndicators = block.querySelector('.carousel-slide-indicators');
//   if (!slideIndicators) return;

//   slideIndicators.querySelectorAll('button').forEach((button) => {
//     button.addEventListener('click', (e) => {
//       const slideIndicator = e.currentTarget.parentElement;
//       showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
//     });
//   });

//   block.querySelector('.slide-prev').addEventListener('click', () => {
//     showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
//   });
//   block.querySelector('.slide-next').addEventListener('click', () => {
//     showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
//   });

//   const slideObserver = new IntersectionObserver((entries) => {
//     entries.forEach((entry) => {
//       if (entry.isIntersecting) updateActiveSlide(entry.target);
//     });
//   }, { threshold: 0.5 });
//   block.querySelectorAll('.carousel-slide').forEach((slide) => {
//     slideObserver.observe(slide);
//   });
// }

// function createSlide(row, slideIndex, carouselId) {
//   const slide = document.createElement('li');
//   slide.dataset.slideIndex = slideIndex;
//   slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
//   slide.classList.add('carousel-slide');

//   row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
//     column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
//     slide.append(column);
//   });

//   const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
//   if (labeledBy) {
//     slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
//   }

//   return slide;
// }

// let carouselId = 0;
// export default async function decorate(block) {
//   carouselId += 1;
//   block.setAttribute('id', `carousel-${carouselId}`);
//   const rows = block.querySelectorAll(':scope > div');
//   const isSingleSlide = rows.length < 2;

//   const placeholders = await fetchPlaceholders();

//   block.setAttribute('role', 'region');
//   block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

//   const container = document.createElement('div');
//   container.classList.add('carousel-slides-container');

//   const slidesWrapper = document.createElement('ul');
//   slidesWrapper.classList.add('carousel-slides');
//   block.prepend(slidesWrapper);

//   let slideIndicators;
//   if (!isSingleSlide) {
//     const slideIndicatorsNav = document.createElement('nav');
//     slideIndicatorsNav.setAttribute('aria-label', placeholders.carouselSlideControls || 'Carousel Slide Controls');
//     slideIndicators = document.createElement('ol');
//     slideIndicators.classList.add('carousel-slide-indicators');
//     slideIndicatorsNav.append(slideIndicators);
//     block.append(slideIndicatorsNav);

//     const slideNavButtons = document.createElement('div');
//     slideNavButtons.classList.add('carousel-navigation-buttons');
//     slideNavButtons.innerHTML = `
//       <button type="button" class= "slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
//       <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
//     `;

//     container.append(slideNavButtons);
//   }

//   rows.forEach((row, idx) => {
//     const slide = createSlide(row, idx, carouselId);
//     slidesWrapper.append(slide);

//     if (slideIndicators) {
//       const indicator = document.createElement('li');
//       indicator.classList.add('carousel-slide-indicator');
//       indicator.dataset.targetSlide = idx;
//       indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}"></button>`;
//       slideIndicators.append(indicator);
//     }
//     row.remove();
//   });

//   container.append(slidesWrapper);
//   block.prepend(container);

//   if (!isSingleSlide) {
//     bindEvents(block);
//   }
// }

export default async function decorate(block) {
  [...block.children].forEach((child, i) => {
    child.classList.add(`sketch-screen${i+1}`);
  });
}
// slide up
// document.querySelectorAll('[class*=" sketch-screen"]').forEach(slide => {
//   // Create wrapper div
//   const wrapper = document.createElement('div');
//   wrapper.className = 'inner-content';

//   // Move existing child nodes into wrapper
//   while (slide.firstChild) {
//     wrapper.appendChild(slide.firstChild);
//   }

//   // Append wrapper inside slide
  
//   slide.appendChild(wrapper);
// });
// const container = document.querySelector('.tabs-dots');
// if (container) {
//   const nav = document.createElement('nav');
//   nav.className = 'vertical-dot-nav slide-up-nav';
//   const ul = document.createElement('ul');
//   const dotCount = 5;      // number of dots
//   let activeIndex = 0;     // start with first active

//   for (let i = 0; i < dotCount; i++) {
//     const li = document.createElement('li');
//     li.className = i === activeIndex ? 'active' : '';

//     // Create anchor inside each dot using class selector instead of ID
//     const sectionClass = `sketch-screen${i + 1}`;
//     const a = document.createElement('a');
//     a.href = '#';  // Prevent default jump
//     a.dataset.targetClass = sectionClass; // store target class for scroll


//     li.appendChild(a);
//     li.addEventListener('click', (e) => {
//       e.preventDefault(); // prevent anchor default behavior
//       setActiveDot(i);
//       updateNavVisibility();
//       showSlide(sectionClass);
//       const target = document.querySelector(`.${sectionClass}`);
//       if (target) {
//         target.scrollIntoView({behavior: 'smooth'});
//       }
//     });
//     ul.appendChild(li);
//   }
//   nav.appendChild(ul);
//   container.appendChild(nav);

//   updateNavVisibility();
//   showSlide(`sketch-screen${activeIndex + 1}`); // Show initial slide
// }

// function setActiveDot(index) {
//   const dots = document.querySelectorAll('.vertical-dot-nav li');
//   dots.forEach((dot, i) => {
//     dot.classList.toggle('active', i === index);
//   });
// }

// function updateNavVisibility() {
//   const nav = document.querySelector('.vertical-dot-nav');
//   let shouldSlideUp = false;
//   nav.querySelectorAll('li').forEach(dot => {
//     if (dot.classList.contains('active')) {
//       const link = dot.querySelector('a');
//       if (link && link.classList.contains('slide-up')) {
//         shouldSlideUp = true;
//       }
//     }
//   });
//   if (shouldSlideUp) {
//     nav.classList.add('visible');
//   } else {
//     nav.classList.remove('visible');
//   }
// }

// function showSlide(targetClass) {
//   const slides = document.querySelectorAll('[class*=" sketch-screen"]');
//   slides.forEach(slide => {
//     if (slide.classList.contains(targetClass)) {
//       slide.style.display = 'block';
//       requestAnimationFrame(() => {
//         slide.classList.add('slide-up-visible');
//         slide.classList.remove('slide-up-hidden');
//       });
//     } else {
//       slide.classList.remove('slide-up-visible');
//       slide.classList.add('slide-up-hidden');
//       setTimeout(() => {
//         slide.style.display = 'none';
//       }, 300); // match CSS transition duration
//     }
//   });
// }




