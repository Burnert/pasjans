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
