class Pile extends StackCollection {
	constructor(pileId) {
		super();
		this.id = pileId;
		this.allowMultiple = false;
	}
}