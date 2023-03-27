chrome.storage.sync.get('theme', function ({ theme }) {
  const css = (theme === 'pavillon-e-theme')
    ? `
      #etsBellowHeader {
        background-image: url(${chrome.runtime.getURL('assets/pavillonE.jpg')}), linear-gradient(to bottom, white, white) !important;
        background-repeat: repeat-x;
      }

      body{
        background-color:white!important;
      }

      #etsHeaderContainer{
        background-color: #262626 !important;
        box-shadow: 3px 3px 15px black !important;
        webkit-box-shadow: 3px 3px 15px black !important;
      }

      #etsMCContainer{
        box-shadow: 0px 0px 20px 1px!important;
      }
    `
    : (theme === 'pavillon-e-2-theme')
      ? `
        #etsBellowHeader {
          background-image: url(${chrome.runtime.getURL('assets/pavillonE2.svg')}) !important;
          background-size: cover!important;
          background-repeat: repeat;
        }

        body{
          background-color:#EC5C62!important;
        }

        #etsHeaderContainer{
          background-color: #262626 !important;
          box-shadow: 3px 3px 15px black !important;
          webkit-box-shadow: 3px 3px 15px black !important;
        }

        #etsMCContainer{
          box-shadow: 0px 0px 20px 1px!important;
        }
      `
      : '';

  if (css) {
    injectCSS(css);
  }
});

function injectCSS(css) {
  const existingStyle = document.querySelector('.signets-plugin-style');
  if (existingStyle) {
    existingStyle.textContent = css;
  } else {
    const style = document.createElement('style');
    style.setAttribute('class', 'signets-plugin-style');
    style.type = 'text/css';
    style.textContent = css;
    document.head.appendChild(style);
  }
}