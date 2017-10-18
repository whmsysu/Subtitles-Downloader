// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
$(".list-group-item").click(function(e){
  if ($(this).hasClass("active")) {
    $(this).removeClass("active");
  }
  else{
    $(this).addClass("active");
  }
});

$("#remove-button").click(function(e){
  $(".active").remove();
});