//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var recorder; 						//WebAudioRecorder object
var input; 							//MediaStreamAudioSourceNode  we'll be recording
var encodingType; 					//holds selected encoding for resulting audio (file)
var encodeAfterRecord = true;       // when to encode

// apiType
// 'song' to call song ASR
// 'number' to call number ASR
// var apiType = 'song';
var list = [];

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext; //new audio context to help us record

var recordButton = document.getElementById("recordButton");
var searcHButton = document.getElementById("searchButton");
var searchKeyword = document.getElementById("searchKeyword");
var tooltipText = document.getElementById("tooltipText");
var helperText = document.getElementById("helperText");
var songListTitle = document.getElementById("songListTitle");
var resumeAfterRecord = false;

// Global var to add state for record button
var recording = false;

// Add events to the record button
recordButton.addEventListener("click", record);

var worker = new Worker('/static/filter_worker.js');
worker.addEventListener('message', function(e) {
    console.log(e.data);
    updateSongTable(e.data);
});

//function changeAPIType(type) {
//    apiType = type;
//    if (apiType === 'song')
//        helperText.innerText = "Cari Lagu";
//    else
//        helperText.innerText = "Sebutkan nomor lagu untuk memainkan lagu";
//}

function record() {
    if (!recording)
        startRecording();
    else
        stopRecording();
}

var opacity = 0;
window.setInterval(function() {
    if (!recording) {
        recordButton.style.opacity = 100;
    } else {
        recordButton.style.opacity = opacity;
        opacity = (opacity === 0) ? 100 : 0;
    }
}, 250);

function startRecording() {
    if (isPlaying) {
        resumeAfterRecord = true;
        playBtn.click();
    } else {
        resumeAfterRecord = false;
    }
	console.log("startRecording() called");
    tooltipText.innerText = "Tekan tombol untuk berhenti merekam";

	/*
		Simple constraints object, for more advanced features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    var constraints = { audio: true, video:false }

    /*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device

		*/
		audioContext = new AudioContext();

		//assign to gumStream for later use
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);
		
		encodingType = 'wav';

		recorder = new WebAudioRecorder(input, {
		  workerDir: "js/", // must end with slash
		  encoding: encodingType,
		  numChannels:2, //2 is the default, mp3 encoding supports only 2
		  //onEncoderLoading: function(recorder, encoding) {
		  //},
		  //onEncoderLoaded: function(recorder, encoding) {
		  //}
		});

		recorder.onComplete = function(recorder, blob) { 
			recognizeSound(blob, recorder.encoding);
		}

		recorder.setOptions({
		  timeLimit:120,
		  encodeAfterRecord:encodeAfterRecord,
	      ogg: {quality: 0.5},
	      mp3: {bitRate: 160}
	    });

		//start the recording process
		recorder.startRecording();

	}).catch(function(err) {
        recording = false;
	});
    recording = true;
}

function stopRecording() {
    if (resumeAfterRecord)
        playBtn.click();
	console.log("stopRecording() called");
    tooltipText.innerText = "Tekan tombol untuk memulai merekam";
	
	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

    recording = false;

	//tell the recorder to finish the recording (stop recording + encode the recorded audio)
	recorder.finishRecording();
}


function recognizeSound(blob, encoding){
    var filename = new Date().toISOString() + '.' + encoding;
    var reader = new FileReader();
    // this function is triggered once a call to readAsDataURL returns
    reader.onload = function(event){
        var fd = new FormData();
        fd.append('filename', filename);
        fd.append('api_type', apiType);
        fd.append('blob', event.target.result);
        $.ajax({
            type: 'POST',
            url: '/api/search-asr',
            data: fd,
            processData: false,
            contentType: false
        }).done(function(data) {
            console.log(data);
            /*
            if (data.results && data.results.length > 0) {
                updateSearchResult(data.results);
                if (data.results.length == 1) {
                    // play the song
                    playSong(data.results[0]);
                    apiType = 'song';
                } else {
                    apiType = 'number';
                }
            }
            if (data.number)
                playSongNumber(data.number);
            */
            if (data.keyword) {
            // update input
                input = document.getElementById('searchKeyword');
                input.value = data.keyword || '';
                filterSong();
            }
            //if (data.number)
            //    playSongNumber(data.number);
        });
    };      
    // trigger the read from the reader...
    reader.readAsDataURL(blob);
}

function filterSong() {
    input = document.getElementById('searchKeyword');
    filter = input.value.toLowerCase();
    counter = 1;
    if (filter === '') {
        //changeAPIType('song');
        songListTitle.innerText = "Daftar Judul Lagu";
    } else {
        songListTitle.innerText = "Hasil Pencarian Lagu";
        //changeAPIType('number');
    }
    data = {'keyword': filter, 'list': list};
    worker.postMessage(data);


//    for (var index = 0; index < trList.length; index++) {
//        tdNode = trList[index].getElementsByTagName('td')[1];
//        if (tdNode) {
//            songName = tdNode.textContent || tdNode.innerText;
//            if (songName.toLowerCase().indexOf(filter) > -1) {
//                trList[index].style.display = '';
//                trList[index].getElementsByTagName('td')[0].innerText = counter;
//                if (counter % 2 == 0)
//                    trList[index].style.backgroundColor = '#F0F8FF';
//                else
//                    trList[index].style.backgroundColor = '#FFFFFF';
//                counter++;
//            } else {
//                trList[index].style.display = 'none';
//                trList[index].getElementsByTagName('td')[0].innerText = -1;
//            }
//        }
//    }
}

function updateSongTable(indexList) {
    indexSet = new Set(indexList);
    table = document.getElementById('songTable');
    tbody = table.getElementsByTagName('tbody')[0];
    trList = tbody.getElementsByTagName('tr');

    counter = 1;
    for (var index = 0; index < trList.length; index++) {
        if (indexSet.has(index)) {
            trList[index].style.display = '';
            trList[index].getElementsByTagName('td')[0].innerText = counter;
            if (counter % 2 == 0)
                trList[index].style.backgroundColor = '#F0F8FF';
            else
                trList[index].style.backgroundColor = '#FFFFFF';
            counter++;
        } else {
            trList[index].style.display = 'none';
            trList[index].getElementsByTagName('td')[0].innerText = -1;
        }
    }
}

function playSongNumber(number) {
    filterSong();
    songListNode = document.getElementById('song-list-body');
    trList = songListNode.getElementsByTagName('tr');
    for (var index = 0; index < trList.length; index++) {
        if (parseInt(trList[index].getElementsByTagName('td')[0].innerText) === number) {
            song = trList[index].getElementsByTagName('td')[1].innerText;
            console.log(song);
            playSong(song.toLowerCase());
            trList[index].style.backgroundColor = "lightskyblue";
            break;
        }
    }
}

$(document).keypress(function(e) {
    if(e.which == 13) {
        record();
    }
});

$.ajax({
    url: '/api/songs',
    type: 'GET',
}).done(function(data) {
    list = data.songs;
    init();
});
