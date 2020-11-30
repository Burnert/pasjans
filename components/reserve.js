class ReservePile extends StackCollection {
  constructor(cards) {
    super();
    this.hiddenStack = cards;
    this.hiddenStack.forEach((card, index) => {
      card.owner = { type: 'reserve', reference: this, index: index + 100 };
    });
		this.allowMultiple = false;
  }
  
  reveal(amount) {
    const length = this.hiddenLength();
    for (let i = 0; i < Math.min(amount, length); i++) {
      const card = this.hiddenStack.pop();
      card.setRevealedAnim(true);
      card.owner.index = this.getLength();
      this.putCard(card);
    }
  }

  reset() {
    this.hiddenStack = this.stack.reverse();
    this.hiddenStack.forEach((card, index) => card.owner.index = index + 100);
    this.hiddenStack.forEach(card => card.setRevealedAnim(false));
    this.stack = [];
  }

  hiddenLength() {
    return this.hiddenStack.length;
  }

  clearHidden() {
    this.hiddenStack.splice(0, this.hiddenLength());
  }
}

function isCardInReserveHidden(card) {
  return card.owner.index >= 100;
}