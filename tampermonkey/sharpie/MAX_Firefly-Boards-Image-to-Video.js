// ==UserScript==
// @name         MAX_Activation_Firefly_Boards_Image_to_Video
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Firefly Boards Image to Video
// @author       You
// @match        https://express.adobe.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Create a link element
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://use.typekit.net/pps7abe.css';

  // Append to head
  document.head.appendChild(link);

  // Always start from step 1, only one card at a time
  let currentStep = 1;

  const stepContent = {
      1: {
          text: "Import your harmonized Mini.",
          buttonText: "Next",
          iconImgSrc: "https://main--activations-da--adobedevxsc.aem.live/sharpie/assets/popup-icon/media_1a9ab3b5083454ca85baf8612440a189bb5b1ab25.png",
          bgImage: 'https://main--activations-da--adobedevxsc.aem.live/coca-cola/assets/media_173a58e111a1c3e1f8fc8453d319fb14f66f889cb.png'
      },
      2: {
          text: "Type a short prompt to guide the action <br>—like ‘walking,’ ‘waving,’ or ‘jumping.",
          buttonText: "Next",
          iconImgSrc: "https://main--activations-da--adobedevxsc.aem.live/sharpie/assets/popup-icon/media_1438856b7b58a9a914d1b386cdc61fe1490ff10e4.png",
          bgImage: 'https://main--activations-da--adobedevxsc.aem.live/sharpie/assets/popup-icon/media_1c20c9d30d35131a94da8f113d1177f185cd89dac.jpg'
      },
      3: {
          text: "Generate and preview <br>a few options.",
          buttonText: "Next",
          iconImgSrc: "https://main--activations-da--adobedevxsc.aem.live/sharpie/assets/popup-icon/media_1da37a213a7cabe5f14cafa01055b18946951c5a2.png",
          bgImage: 'https://main--activations-da--adobedevxsc.aem.live/coca-cola/assets/media_114daa25ded116ee560a9032294b531571c2289e4.png'
      },
      4: {
          text: "Pick the version you like best, <br>then download it.",
          buttonText: "Next",
          iconImgSrc: "https://main--activations-da--adobedevxsc.aem.live/sharpie/assets/popup-icon/media_1e230a5b747ff80f8883d1fe0df5919156ec1e2e0.png",
          bgImage: 'https://main--activations-da--adobedevxsc.aem.live/sharpie/assets/popup-icon/media_1ffb20d82eeda5b0ad5cdc58450df5f4019c9b121.jpg'
      }
  };

  function updateDialogContent() {
      const mainText = document.getElementById('frame-main-text');
      const button = document.getElementById('frame-step-button');
      const stepIcon = document.getElementById('frame-step-icon');
      const dots = document.querySelectorAll('.frame-step-dot');

      if (mainText) mainText.innerHTML = stepContent[currentStep].text;
      if (button) button.textContent = stepContent[currentStep].buttonText;
      if (stepIcon) stepIcon.src = stepContent[currentStep].iconImgSrc;
      if (dots.length > 0) {
          dots.forEach((dot, index) => {
              dot.style.backgroundColor = currentStep - 1 === index ? '#242424' : '#848484';
              dot.style.width = currentStep - 1 === index ? '8px' : '6px';
              dot.style.height = currentStep - 1 === index ? '8px' : '6px';
              dot.style.setProperty('background-color', currentStep - 1 === index ? '#242424' : '#848484', 'important');
          });
      }
      let BgImageChange = document.getElementById('frame-walkthrough-dialog');
      if (BgImageChange) {
          BgImageChange.style.backgroundImage = `url(${stepContent[currentStep].bgImage})`;
      }
  }


  function createDialog() {
      let dialog = document.getElementById('frame-walkthrough-dialog');
      if (dialog) {
          updateDialogContent();
          return;
      }
      console.log(stepContent[currentStep].iconImgSrc)
      // Outer dialog
      dialog = document.createElement('div');
      dialog.id = 'frame-walkthrough-dialog';
      dialog.style.cssText = `
          position: fixed !important;
          bottom: 28px !important;
          right: 40px !important;
          z-index: 2147483647 !important;
          background-image: url('https://main--activations-da--adobedevxsc.aem.live/sharpie/assets/popup-icon/media_1ffb20d82eeda5b0ad5cdc58450df5f4019c9b121.jpg');
          padding: 7px !important;
          width: auto!important;
          box-shadow: 0px 0px 2.73543px rgba(0, 0, 0, 0.12), 0px 2.73543px 8.2063px rgba(0, 0, 0, 0.04), 0px 5.47087px 16.4126px rgba(0, 0, 0, 0.08)!important;
          border-radius: 13.6772px !important;
          font-family: "adobe-clean", sans-serif !important;
      `;

      // Inner white card
      const innerCard = document.createElement('div');
      innerCard.style.cssText = `
          background: white !important;
          border-radius: 13.68px !important;
          padding: 25px !important;
          min-width: 400px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
      `;

      // Row 1: Icon+Text horizontal
      const row1 = document.createElement('div');
      row1.style.cssText = `
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 36px !important;
      `;

      const stepIcon = document.createElement('img');
      stepIcon.id = 'frame-step-icon';
      stepIcon.src = stepContent[currentStep].iconImgSrc;
      stepIcon.alt = `Step ${currentStep} icon`;
      stepIcon.style.cssText = `
          width: 75px !important;
          height: 75px !important;
          flex-shrink: 0 !important;
      `;

      const mainText = document.createElement('div');
      mainText.id = 'frame-main-text';
      mainText.innerHTML = stepContent[currentStep].text;
      mainText.style.cssText = `
          font-weight: 800 !important;
          font-size: 30.0898px !important;
          line-height: 36px !important;
          color: #000000 !important;
          font-family: "adobe-clean", sans-serif !important;
      `;

      row1.appendChild(stepIcon);
      row1.appendChild(mainText);

      // Row 2: Dots left, Button right
      const row2 = document.createElement('div');
      row2.style.cssText = `
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          padding-left: 10px !important;
          justify-content: space-between !important;
          margin-top: 37px !important;
      `;

      const dotsIndicator = document.createElement('div');
      dotsIndicator.id = 'frame-dots-indicator';
      dotsIndicator.style.cssText = `
          display: flex !important;
          gap: 15.66px !important;
          align-items: center !important;
      `;
      for (let i = 0; i < 4; i++) {
          const dot = document.createElement('div');
          dot.classList.add('frame-step-dot');
          dot.dataset.step = i + 1;
          dot.style.cssText = `
              border-radius: 100% !important;
              width: ${currentStep - 1 === i ? '8px' : '6px'} !important;
              height: ${currentStep - 1 === i ? '8px' : '6px'} !important;
              background-color: ${currentStep - 1 === i ? '#242424' : '#848484'} !important;
              display: inline-flex !important;
              gap: 15.66px !important;
              align-items: center !important;
              justify-content: center !important;
              transition: width .3s, background .3s !important;
          `;
          dotsIndicator.appendChild(dot);
      }

      const button = document.createElement('button');
      button.id = 'frame-step-button';
      button.textContent = stepContent[currentStep].buttonText;
      button.style.cssText = `
          background: #274DEA !important;
          color: #fff !important;
          border-radius: 27.3188px  !important;
          border: none !important;
          padding: 12px 28px !important;
          font-weight: 700 !important;
          font-size: 23.9039px  !important;
          line-height: 31px  !important;
          cursor: pointer !important;
          min-width: 122px !important;
          transition: background .17s !important;
      `;

      button.addEventListener('mouseenter', function () { this.style.backgroundColor = '#4338ca'; });
      button.addEventListener('mouseleave', function () { this.style.backgroundColor = '#274DEA'; });
      button.addEventListener('click', function () {
          if (currentStep < 4) {
              currentStep++;
              updateDialogContent();
          } else {
              dialog.remove();
          }
      });

      row2.appendChild(dotsIndicator);
      row2.appendChild(button);

      // Build structure and insert
      innerCard.appendChild(row1);
      innerCard.appendChild(row2);
      dialog.appendChild(innerCard);

      // Remove old dialog if any
      if (document.getElementById('frame-walkthrough-dialog')) {
          document.getElementById('frame-walkthrough-dialog').remove();
      }
      (document.body || document.documentElement).appendChild(dialog);
  }

  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createDialog);
  } else {
      createDialog();
  }
  setTimeout(createDialog, 1000);

  const observer = new MutationObserver(function () {
      if (!document.getElementById('frame-walkthrough-dialog')) { createDialog(); }
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });

})();