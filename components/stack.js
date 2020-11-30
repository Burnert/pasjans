class Stack extends StackCollection {
  constructor(stackId) {
    super();
    this.id = stackId;
    this.maxFirstDealCards = stackId + 1;
  }
}