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
var apiType = 'song';

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext; //new audio context to help us record

var recordButton = document.getElementById("recordButton");

// Global var to add state for record button
var recording = false;

// Add events to the record button
recordButton.addEventListener("click", record);

function record() {
    if (!recording)
        startRecording();
    else
        stopRecording();
}

function startRecording() {
	console.log("startRecording() called");

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
		  onEncoderLoading: function(recorder, encoding) {
		  },
		  onEncoderLoaded: function(recorder, encoding) {
		  }
		});

		recorder.onComplete = function(recorder, blob) { 
			recognizeSound(blob,recorder.encoding);
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
	console.log("stopRecording() called");
	
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
            url: '/api/recognize',
            data: fd,
            processData: false,
            contentType: false
        }).done(function(data) {
            console.log(data);
            if (data.results)
                updateSearchResult(data.results);
            if (data.number)
                playSongNumber(data.number);
        });
    };      
    // trigger the read from the reader...
    reader.readAsDataURL(blob);
}

function updateSearchResult(results) {
    index = 1;
    searchListNode = document.getElementById('search-list-body');
    // Removing the old search results
    if (results.length == 0)
        return
    while (searchListNode.firstChild) {
        searchListNode.removeChild(searchListNode.firstChild);
    }
    for (var result in results) {
        // index element
        indexTdNode = document.createElement('td');
        indexNode = document.createTextNode(index);
        indexTdNode.appendChild(indexNode);

        // song element
        resultTdNode = document.createElement('td');
        resultNode = document.createTextNode(results[index-1]);
        resultTdNode.appendChild(resultNode);

        // wrap in tr element
        trNode = document.createElement('tr');
        trNode.appendChild(indexTdNode);
        trNode.appendChild(resultTdNode);

        searchListNode.appendChild(trNode);

        ++index;
    }
    if (results.length == 1) {
        // play the song
        playSong(results[0]);
        apiType = 'song';
    } else {
        apiType = 'number';
    }

}

function playSongNumber(number) {
    searchListNode = document.getElementById('search-list-body');
    if (number > searchListNode.childElementCount)
        return;
    songNode = searchListNode.getElementsByTagName('tr')[number - 1];
    console.log(songNode);
    song = songNode.getElementsByTagName('td')[1].innerText;
    playSong(song);
    apiType = 'song';
}

function playSong(song) {
    audio = document.getElementById('audio-wave');
    console.log(audio.src);
    audio.src = '/static/' + song + '.wav';
    audio.play();
}
