define(['vexflow'], function(Vex) {
	/**
    * LSChordView is a module called by LSViewer to draw chords
    * @exports LSViewer/LSChordView
    */
	function LSChordView(chord, color) {
		this.color = color || "#000";
		this.chord = chord;
	}
	/**
	 * [draw description]
	 * @param  {CanvasContext} ctx           
	 * @param  {Object} barDimensions e.g. {x:1, y:1, w:2, h:2}
	 * @param  {TimeSignatureModel} timeSig       
	 * @param  {Number} chordsY       
	 * @param  {String} fontChords    
	 * @param  {Number} marginLeft    
	 * @param  {Function} boundingBoxFn returns bounding box of drawed chord, i.e. an object like {x:1, y:1, w:2, h:2}
	 * @return {Object}               returns bounding box if function is sent (i.e. when LSViewer.SAVE_CHORDS === true)
	 */
	LSChordView.prototype.draw = function(ctx, barDimensions, timeSig, chordsY, fontChords, marginLeft, boundingBoxFn) {
		if (!fontChords){
			throw "LSChordView - missing params";
		}
		function getChordX (beat, barDimensions, beatWidth) {
			var zeroBasedBeat = beat - 1;
			return barDimensions.left + marginLeft + zeroBasedBeat * beatWidth;
		}
		var beatWidth = (barDimensions.width - marginLeft) / timeSig.getBeats();
		
		ctx.font = fontChords; // font for chords
		ctx.textBaseline = "top"; // font for chords
		ctx.fillStyle = this.color;
		var chordX = getChordX(this.chord.getBeat(), barDimensions, beatWidth)
		ctx.fillStyle = "black";
		ctx.textBaseline = "alphabetic"; // font for chords
		ctx.fillText(this.chord.toString(), chordX, barDimensions.top - chordsY);
		if (boundingBoxFn){
			return boundingBoxFn(ctx, this.chord.toString(), chordX, barDimensions.top - chordsY);
		}
	};

	return LSChordView;
});