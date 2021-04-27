chrome.storage.sync.get('theme', function (arg) {
  if (arg.theme === 'pavillon-e-theme') {
    injectCSS( /*css*/ `
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
          }`
    );
  } else if (arg.theme === 'pavillon-e-2-theme') {
    injectCSS( /*css*/ `
        #etsBellowHeader {
          background-image: url(${chrome.runtime.getURL('assets/pavillonE2.png')}) !important;
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
        }`
    );
  }
});

function injectCSS(css) {
  let style = document.createElement('style');
  style.setAttribute('class', 'signets-plugin-style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
  return style;
}
