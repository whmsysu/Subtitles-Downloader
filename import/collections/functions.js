module.exports = {
    'backToDragView': function() {
        $("#drag-view").css("display", "flex");
        $("#media-list-view").css("display", "none");
    },

    'switchToListView': function() {
        $("#drag-view").css("display", "none");
        $("#media-list-view").css("display", "block");
    }
}