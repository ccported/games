var donePlayingIntro = false;

/**
 * Play the Armor Games intro
 * @param {string} windowHandle the canvas element 
 * @param {string} directory Directory to find the armor games intros in. A / will be automatically added
 */
function playArmorGamesIntro(windowHandle, onDone) {
    // skip
    onDone();
    donePlayingIntro = true;
    return;
}