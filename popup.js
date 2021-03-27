window.onload = function () {
    let checkboxNoColors = document.querySelector("#disablecolors");
    let checkboxShowGrades = document.querySelector("#alwaysshowgrades");
    let radioThemes = Array.from(document.querySelectorAll('[name="theme"]'));

    chrome.storage.sync.get(['noColors', 'showGrades', 'theme'], function (arg) {
        checkboxNoColors.checked = false;
        if (typeof arg.noColors !== 'undefined') {
            if (arg.noColors === true) checkboxNoColors.checked = true;
        }

        checkboxShowGrades.checked = false;
        if (typeof arg.showGrades !== 'undefined') {
            if (arg.showGrades === true) checkboxShowGrades.checked = true;
        }

        if (typeof arg.theme !== 'undefined') {
            for (let radioTheme of radioThemes) {
                if (radioTheme.getAttribute("value") === arg.theme) radioTheme.checked = true;
            }
        } else {
            chrome.storage.sync.set({ theme: "default-theme" });
            radioThemes[0].checked = true;
        }

    });
    checkboxNoColors.addEventListener("click", function () {
        chrome.storage.sync.set({ noColors: checkboxNoColors.checked });
    });

    checkboxShowGrades.addEventListener("click", function () {
        chrome.storage.sync.set({ showGrades: checkboxShowGrades.checked });
    });

    for (let radioTheme of radioThemes) {
        radioTheme.addEventListener("click", function () {
            chrome.storage.sync.set({ theme: radioTheme.getAttribute("value") });
        });
    }

};