'use strict';
var meeting;
var host = 'localhost'; // HOST_ADDRESS gets injected into room.ejs from the server side when it is rendered
$( document ).ready(function() {
    // console.log('address', host);
    /////////////////////////////////
    // CREATE MEETING
    /////////////////////////////////
    meeting = new Meeting(host);

    meeting.onLocalVideo(function(stream) {
            //alert(stream.getVideoTracks().length);
            document.querySelector('#localVideo').srcObject = stream;

            $("#micMenu").on("click",function callback(e) {
                toggleMic();
            });

            $("#videoMenu").on("click",function callback(e) {
                toggleVideo();
            });
            $("#localVideo").prop('muted', true);
            adjustVideoSize();
        }
    );

    meeting.onRemoteVideo(function(stream, participantID) {
        // console.log('adding success');
            addRemoteVideo(stream, participantID);
        }
    );

    meeting.onParticipantHangup(function(participantID) {
            // Someone just left the meeting. Remove the participants video
            removeRemoteVideo(participantID);
        }
    );

    meeting.onChatReady(function() {
            console.log("Chat is ready");
        }
    );

    var room = window.location.pathname.match(/([^\/]*)\/*$/)[1];
    meeting.joinRoom(room);
}); // end of document.ready
$( window ).resize(adjustVideoSize);
function addRemoteVideo(stream, participantID) {
    // $("#"+participantID).remove();
    var $videoBox = $("<div class='videoWrap' id='"+participantID+"'></div>");
    var $video = $("<video class='videoBox' autoplay></video>");
    $video.prop("srcObject", stream);
    $videoBox.append($video);
    $("#videosWrapper").append($videoBox);
    adjustVideoSize();

}

function removeRemoteVideo(participantID) {
   var $remove = $("#"+participantID);
   if($(".videoWrap").last().attr('id')!=participantID) {
      $remove.before($(".videoWrap").last());
   }
   
   $remove.remove();
   adjustVideoSize();
}

function adjustVideoSize() {
    var numOfVideos = $(".videoWrap").length;
    var $container = $("#faceCall");
    var numOfColumns=Math.min(numOfVideos, 3);
    
    var newWidth, newHeight;
    newWidth = $container.width()/numOfColumns;

    // check if we can start a new row
    var scale = newWidth/$(".videoWrap").width();
    newHeight = $(".videoWrap").height()*scale;

    var percent = (newWidth/$container.width())*100;
    $(".videoWrap").css("display", "table-cell");
    $(".videoWrap").css("vertical-align", "middle");
    $(".videoWrap").css("text-align", "center");
    $(".videoWrap").css("width", $container.width()-5);
    $(".videoWrap").css("height", "auto");

    var numOfRows = parseInt(Math.ceil(numOfVideos/3));

    $(".videoBox").prop("width", Math.min(newWidth*0.9, $container.height()*0.9/numOfRows*4/3));
    
    $('#videosWrapper').find("br").remove();
    $('.videoWrap:nth-child('+3+'n)').after("<br>");
}