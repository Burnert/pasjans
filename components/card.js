const valueConversionTable = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

const colorConversionTable = [
  'S',
  'H',
  'C',
  'D',
];

function convertIdToColorValuePair(id) {
  const color = colorConversionTable[(id >>> 4) & 0x3];
  const value = valueConversionTable[id & 0xF];
  return { color, value };
}

function convertIdToColorValuePairRaw(id) {
  const color = (id >>> 4) & 0x3;
  const value = id & 0xF;
  return { color, value };
}

class GameObject {
  constructor(id) {
    this.x = 0;
    this.y = 0;
    this.element = null;
    this.imageName = null;
    this.mouseOver = false;
    this.id = id;
  }

  createElement(target, type, id, cl) {
    this.elementType = type;
    const attributes = [
      { name: 'class', value: cl },
      { name: 'id', value: id},
    ];
    if (type == 'img') {
      attributes.push({ name: 'src', value: `./gfx/${this.getImgName()}.png` });
      preloadImage(`./gfx/${this.getImgName()}.png`);
    }
    const element = createElement(type, attributes);
    element.ondragstart = () => false; // Prevent image dragging
    target.append(element);
    this.element = element;
    this.setVisible(false);
  }

  changeImage(img) {
    this.element.setAttribute('src', img);
  }

  addEventListener(type, listener) {
    this.element.addEventListener(type, listener);
  }

  setVisible(visible) {
    this.element.style.visibility = visible ? '' : 'hidden';
  }

  setPosition(x, y) {
    this.element.style.left = x + 'px';
    this.element.style.top = y + 'px';
    this.x = x;
    this.y = y;
  }

  getImgName() {
    return this.imageName;
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  setZIndex(index) {
    this.element.style.zIndex = index;
  }

  setWidth(width) {
    this.element.style.width = `${width}px`;
  }

  setHeight(height) {
    this.element.style.height = `${height}px`;
  }

  getWidth() {
    return this.element.offsetWidth;
  }

  getHeight() {
    return this.element.offsetHeight;
  }

  destroy() {
    this.element.remove();
  }
}

class Card extends GameObject {
  constructor(attributes) {
    super(attributes);
    this.id = (attributes.num << 6) + (attributes.color << 4) + attributes.value;
    this.revealed = false;
    this.floating = false;
    this.owner = { type: '', reference: null, index: -1 };
  }

  createElement(target) {
    super.createElement(target, 'img', `c${this.id}`, 'card');
  }

  setRevealedAnim(revealed) {
    this.element.classList.remove('card-flip');
    this.element.classList.remove('card-unflip');
    // Update member variable instantly
    this.revealed = revealed;
    // Start the flip
    this.element.classList.add('card-flip');
    PrefixedEvent(this.element, 'AnimationEnd', () => {
      // Half way through (90 degrees) change images
      this.setRevealed(revealed);
      // Unflip the card (but it looks like it actually flipped 180 degrees)
      this.element.classList.remove('card-flip');
      this.element.classList.add('card-unflip');
      PrefixedEvent(this.element, 'AnimationEnd', () => {
        this.element.classList.remove('card-unflip');
      });
    });
  }

  changeImage(img) {
    super.changeImage(img ? img : `./gfx/${this.getImgName()}.png`);
  }

  updateImage() {
    this.setRevealed(this.revealed);
  }

  setRevealed(revealed) {
    this.revealed = revealed;
    this.changeImage(revealed ? null : `./gfx/${cardBack + '_back'}.png`);
  }

  setFloating(floating) {
    this.floating = floating;
    if (floating) {
      this.setZIndex(1000 + floating);
      this.element.classList.add('floating');
    }
    else {
      if (this.owner.type != '') {
        this.setZIndex(100 + this.owner.index);
      }
      this.element.classList.remove('floating');
    }
  }

  getColor() {
    return convertIdToColorValuePairRaw(this.id).color;
  }

  getValue() {
    return convertIdToColorValuePairRaw(this.id).value;
  }

  getImgName() {
    const { color, value } = convertIdToColorValuePair(this.id);
    return value + color;
  }

  getNextCardInStack() {
    if (this.owner.type == '') return null; // Doesn't belong to any collection
    if (this.owner.index + 1 >= this.owner.reference.getLength()) return null; // There isn't a next card
    return this.owner.reference.stack[this.owner.index + 1];
  }

  getPrevCardInStack() {
    if (this.owner.type == '') return null; // Doesn't belong to any collection
    if (this.owner.index == 0) return null; // There isn't a previous card
    return this.owner.reference.stack[this.owner.index - 1];
  }

  isLastCardInStack() {
    if (this.owner.type == '') return false; // Doesn't belong to any collection
    return this == this.owner.reference.getLast();
  }

  isMovable() {
    if (!this.revealed || bGameOver) return false;
    const nextCard = this.getNextCardInStack();
    if (nextCard) {
      if (nextCard.getValue() == this.getValue() - 1)
        return nextCard.isMovable();
    }
    else
      return true;
  }

  updateMove() {
    if (this.floating) {
      this.setPosition(
        cursorPosition.x - relativePickupPoint.x,
        cursorPosition.y - relativePickupPoint.y + (this.floating - 1) * calcCardVSpacing());
    }
  }
}
