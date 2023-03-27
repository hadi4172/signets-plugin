window.addEventListener('load', () => {
    const checkboxNoColors = document.querySelector('#disablecolors');
    const checkboxGPAInNumber = document.querySelector('#gpainnumber');
    const checkboxShowGrades = document.querySelector('#alwaysshowgrades');
    const checkboxPreciseGrades = document.querySelector('#precisegrades');
    const radioThemes = Array.from(document.querySelectorAll('[name="theme"]'));
    const estimerCoteBtn = document.querySelector('#btn-estimer-cote');
  
    chrome.storage.sync.get(
      ['noColors', 'showGrades', 'theme', 'preciseGrades', 'gpaInNumber'],
      ({ noColors, showGrades, theme, preciseGrades, gpaInNumber }) => {
        checkboxNoColors.checked = noColors ?? false;
        checkboxGPAInNumber.checked = gpaInNumber ?? false;
        checkboxShowGrades.checked = showGrades ?? false;
        checkboxPreciseGrades.checked = preciseGrades ?? false;
        
        const selectedTheme = radioThemes.find(theme => theme.value === theme);
        selectedTheme?.setAttribute('checked', true) ?? radioThemes[0].setAttribute('checked', true);
    });
  
    const updateChromeStorage = (key, value) => chrome.storage.sync.set({ [key]: value });
    
    checkboxNoColors.addEventListener('click', () => updateChromeStorage('noColors', checkboxNoColors.checked));
    checkboxGPAInNumber.addEventListener('click', () => updateChromeStorage('gpaInNumber', checkboxGPAInNumber.checked));
    checkboxShowGrades.addEventListener('click', () => updateChromeStorage('showGrades', checkboxShowGrades.checked));
    checkboxPreciseGrades.addEventListener('click', () => updateChromeStorage('preciseGrades', checkboxPreciseGrades.checked));
    radioThemes.forEach(theme => theme.addEventListener('click', () => updateChromeStorage('theme', theme.value)));
    
    estimerCoteBtn.addEventListener('click', () => chrome.windows.create({ url: 'estimerCote.html', type: 'popup', width: 300, height: 190 }));
  });  