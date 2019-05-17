'use strict';
var meeting;
var host = 'https://34.83.45.215:443'; // HOST_ADDRESS gets injected into room.ejs from the server side when it is rendered
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
$( window ).resize(function() {
    adjustVideoSize();
});
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
    $("#"+participantID).remove();
    adjustVideoSize();
}
function adjustVideoSize() {
    var numOfVideos = $(".videoWrap").length;
    if (numOfVideos>0) {
        var $container = $("#faceCall");
        var numOfColumns=numOfVideos;
        if(numOfColumns>2) numOfColumns=2;
        var newWidth, newHeight;
        newWidth = $container.width()/numOfColumns;

        // check if we can start a new row
        var scale = newWidth/$(".videoWrap").width();
        newHeight = $(".videoWrap").height()*scale;

        var percent = (newWidth/$container.width())*100;
        $(".videoWrap").css("width", percent-5+"%");
        $(".videoWrap").css("height", "auto");
        $(".videoWrap").css("display", "table-cell");
        $(".videoWrap").css("vertical-align", "middle");

        $(".videoBox").prop("width", newWidth*0.9);

        //var numOfColumns = Math.ceil(Math.sqrt(numOfVideos));
        // for (var i=2; i<=numOfVideos; i++) {
        //  if (numOfVideos % i === 0) {
        //      numOfColumns = i;
        //      break;
        //  }
        // }
        $('#videosWrapper').find("br").remove();
        $('.videoWrap:nth-child('+numOfColumns+'n)').after("<br>");
    } else if (numOfVideos == 2) {
        $(".videoWrap").width('auto');
        $("#localVideoWrap").css("width", 20+"%");
        $('#videosWrapper').find("br").remove();
    } else {
        $("#localVideoWrap").width('auto');
        $("#localVideo").prop('width', 500);
        $('#videosWrapper').find("br").remove();
    }
}