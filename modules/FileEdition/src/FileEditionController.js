define([
	'mustache',
	'modules/core/src/SongModel',
	'modules/converters/MusicCSLJson/src/SongModel_CSLJson',
	'modules/converters/MusicXML/src/SongModel_MusicXML',
	'pubsub',
	'utils/UserLog',
	'utils/apiFlowMachines/ComposerServlet',
	'utils/AjaxUtils',
	'jsPDF',
	'modules/converters/MusicXML/utils/musicXMLParser'
], function(Mustache, SongModel, SongModel_CSLJson, SongModel_MusicXML, pubsub, UserLog, ComposerServlet, AjaxUtils, jsPDF, musicXMLParser) {

	function FileEditionController(songModel, view) {
		this.songModel = songModel || new SongModel();
		this.view = view;
		this.initSubscribe();
	}

	/**
	 * Subscribe to view events
	 */
	FileEditionController.prototype.initSubscribe = function() {
		var self = this;
		$.subscribe('FileEditionView-importMusicCSLJSON', function(el, options) {
			self.importMusicCSLJSON();
		});
		$.subscribe('FileEditionView-importMusicXML', function(el, options) {
			self.importMusicXML();
		});

		$.subscribe('FileEditionView-sound_export', function(el, options) {
			var exportType = (options && typeof options.exportType !== "undefined") ? options.exportType : 'mp3';
			var chord = (options && typeof options.chord !== "undefined") ? options.chord : true;
			var tick = (options && typeof options.tick !== "undefined") ? options.tick : false;
			var JSONSong = SongModel_CSLJson.exportToMusicCSLJSON(self.songModel);
			JSONSong = JSON.stringify(JSONSong);
			var tempo = self.songModel.getTempo();
			if (exportType === 'mid') {
				self.exportMidiFile(JSONSong, tempo, chord, tick);
			} else {
				self.exportAudioFile(JSONSong, tempo, exportType, chord, tick);
			}
		});
		$.subscribe('FileEditionView-exportPNG', function(el) {
			self.exportPNG();
		});
		$.subscribe('FileEditionView-exportPDF', function(el) {
			self.exportAndPromptLeadsheetToPDF(self.songModel.getTitle(), self.songModel.getComposer(), self.songModel.getTimeSignature(), self.songModel.getStyle());
		});
		$.subscribe('FileEditionView-exportMusicCSLJSON', function(el) {
			self.exportLeadsheetJSON();
		});
	};

	FileEditionController.prototype.importMusicCSLJSON = function(JSONSong) {
		JSONSong = SongModel_CSLJson.exportToMusicCSLJSON(this.songModel);
		this.songModel = SongModel_CSLJson.importFromMusicCSLJSON(JSONSong);
		myApp.viewer.draw(this.songModel);
	};

	FileEditionController.prototype.importMusicXML = function(musicXMLSong) {
		var filepath = '';
		filepath = '/samples/musicXML/Ferme.xml';
		var song = SongModel_MusicXML.importFromMusicXML(filepath);
		console.log(song);
		this.songModel = song;
		myApp.viewer.draw(this.songModel);
	};

	/**
	 * Propose file to be downloaded by user
	 * @param  {String} title     title of file downloaded, title can contain extension eg "my_file" or "my_file.png"
	 * @param  {String} path      Real path to download from eg "www.url.com/my_tmp_file_is_here.mp3"
	 * @param  {String} extension optionnal arguments, if defined, be carefull to write the dot at begining, eg ".mp3"
	 */
	FileEditionController.prototype.promptFile = function(title, path, extension) {
		if (typeof extension === "undefined") {
			extension = '';
		}
		var export_link = $('<a>', {
			download: title + extension,
			href: path
		}).prependTo('body');
		export_link[0].click();
		export_link.remove();
	};

	FileEditionController.prototype.exportAudioFile = function(JSONSong, tempo, exportType, chord, tick) {
		var self = this;
		var idLog = UserLog.log('info', 'Computing...');
		var request = ComposerServlet.getRequestForSimpleAudio(JSONSong, tempo, chord, tick);
		AjaxUtils.servletRequest('flow', 'composer', request, function(data) {
			UserLog.removeLog(idLog);
			console.log(data);
			if (typeof data !== "undefined") {
				if (typeof data.file === "undefined") {
					var message = 'Error while trying to build audio from Leadsheet';
					if (typeof data.error !== "undefined") {
						message = data.error;
					} else if (typeof data.message !== "undefined") {
						message = data.message;
					}
					UserLog.logAutoFade('error', message);
				} else {
					self.promptFile(self.songModel.getTitle() + '.' + exportType, data.file);
				}
			}
		});
	};

	FileEditionController.prototype.exportMidiFile = function(JSONSong, tempo, chord, tick) {
		var self = this;
		var idLog = UserLog.log('info', 'Computing...');
		var request = ComposerServlet.getRequestForSimpleMidi(JSONSong, tempo, chord, tick);
		AjaxUtils.servletRequest('flow', 'composer', request, function(data) {
			UserLog.removeLog(idLog);
			if (typeof data !== "undefined") {
				if (typeof data.file === "undefined") {
					var message = 'Error while trying to build midi from Leadsheet';
					if (typeof data.error !== "undefined") {
						message = data.error;
					} else if (typeof data.message !== "undefined") {
						message = data.message;
					}
					UserLog.logAutoFade('error', message);
				} else {
					self.promptFile(self.songModel.getTitle() + '.mid', data.file);
				}
			}
		});
	};

	FileEditionController.prototype.exportAndPromptLeadsheetToPDF = function(title, composer, timeSignature, style, sources_abr) {
		var srcCanvas = $("canvas")[0];
		// create a dummy CANVAS
		var destinationCanvas = document.createElement("canvas");
		destinationCanvas.width = srcCanvas.width;
		destinationCanvas.height = srcCanvas.height;
		var destCtx = destinationCanvas.getContext('2d');
		// create a rectangle with the desired color
		destCtx.fillStyle = "#FFFFFF";
		destCtx.fillRect(0, 0, srcCanvas.width, srcCanvas.height);
		// draw the original canvas onto the destination canvas
		destCtx.drawImage(srcCanvas, 0, 0);

		var imgData = destinationCanvas.toDataURL('image/jpeg', 1);

		var totalWidth = 200;
		var totalHeight = totalWidth * (srcCanvas.height / srcCanvas.width);

		var doc = new jsPDF();
		doc.setFontSize(34);
		// doc.text(15, 20, title);
		// doc.setFontSize(18);
		// doc.text(15, 30, composer);
		doc.addImage(imgData, 'JPEG', 10, 23, totalWidth, totalHeight);
		doc.setFontSize(10);
		doc.text(15, 20, style + ' (' + timeSignature + ')');
		if (totalHeight >= 365) {
			doc.addPage();
			doc.addImage(imgData, 'JPEG', 10, -270, totalWidth, totalHeight);
		}
		if (sources_abr !== "") {
			sources_abr = '_' + sources_abr;
		}
		doc.save(title + sources_abr + '.pdf');
	};

	FileEditionController.prototype.exportPNG = function() {
		this.promptFile(this.songModel.getTitle() + '.png', myApp.viewer.canvas.toDataURL());
	};

	FileEditionController.prototype.exportLeadsheetJSON = function() {
		var JSONSong = SongModel_CSLJson.exportToMusicCSLJSON(this.songModel);
		// Code is a bit special for json because we transform data and we add a 'data:' prefix after href to make it works
		var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(JSONSong));
		var export_link = $('<a>', {
			download: this.songModel.getTitle() + '.json',
			href: 'data:' + data
		}).prependTo('body');
		export_link[0].click();
		export_link.remove();
	};

	return FileEditionController;
});