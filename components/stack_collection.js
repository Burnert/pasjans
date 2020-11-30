class StackCollection {
  constructor() {
    this.stack = [];
    this.allowMultiple = true;
  }
  
  putCard(card) {
    this.stack.push(card);
  }
  
  popCard() {
    return this.stack.pop();
  }
  
  putCardMultiple(cards) {
    if (!this.allowMultiple) return;
    this.stack.push(...cards);
  }
  
  popCardMultiple(position) {
    if (!this.allowMultiple) return null;
    return this.stack.splice(position, this.stack.length - position);
  }

  forEach(func) {
    this.stack.forEach(func);
  }

  getLength() {
    return this.stack.length;
  }

  getLast() {
    return this.stack[this.stack.length - 1];
  }

  clear() {
    this.stack.splice(0, this.stack.length);
  }
}