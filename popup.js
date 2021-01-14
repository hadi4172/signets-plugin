window.onload = function () {
    let checkboxNoColors = document.querySelector("#disablecolors");
    chrome.storage.sync.get('noColors', function (arg) {
        checkboxNoColors.checked = false;
        if (typeof arg.noColors !== 'undefined') {
            if(arg.noColors === true) checkboxNoColors.checked = true;
        }
    });
    checkboxNoColors.addEventListener("click", function () {
        chrome.storage.sync.set({noColors: checkboxNoColors.checked});
    });
};