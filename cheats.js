function swapCards(card1, card2) {
  const card1Color = card1.slice(card1.length - 1, card1.length);
  const card1Value = card1.slice(0, card1.length - 1);
  const card2Color = card2.slice(card2.length - 1, card2.length);
  const card2Value = card2.slice(0, card2.length - 1);
  const card1ColorIndex = colorConversionTable.findIndex(v => v == card1Color);
  const card1ValueIndex = valueConversionTable.findIndex(v => v == card1Value);
  const card2ColorIndex = colorConversionTable.findIndex(v => v == card2Color);
  const card2ValueIndex = valueConversionTable.findIndex(v => v == card2Value);
  const card1Id = (card1ColorIndex << 4) + card1ValueIndex;
  const card2Id = (card2ColorIndex << 4) + card2ValueIndex;

  const cardObj1 = getCardById(card1Id);
  const cardObj2 = getCardById(card2Id);

  const cardObj1Owner = cardObj1.owner;
  const cardObj2Owner = cardObj2.owner;
  
  const cardObj1Revealed = cardObj1.revealed;
  cardObj1.setRevealed(cardObj2.revealed);
  cardObj2.setRevealed(cardObj1Revealed);

  cardObj1Owner.reference.stack[cardObj1Owner.index] = cardObj2;
  cardObj2Owner.reference.stack[cardObj2Owner.index] = cardObj1;

  cardObj1.owner = cardObj2Owner;
  cardObj2.owner = cardObj1Owner;

  calculatePosition();
  sortZIndex();
}