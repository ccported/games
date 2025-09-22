let deck = []; // トランプ
let foundations = [[],[],[],[]]; // 完成エリア
let tables = [[],[],[],[],[],[],[]]; // 場札
let waste = []; // 捨て札
let stock = []; // 山札
let selectedCard = null; // 選択中のカード
let selectedPile = null; // 選択中の山（場所）
let selectedCards = [];
let moves = []; // 行動履歴
let lastClickTime = 0;
let animatingCards = [];
let won = false;
let startTime;
let clearTime;

function setup() {
  createCanvas(800, 700);
  initializeDeck();
  dealCards();
	startTime = millis();
	
	/*
	let button = createButton('Debug');
	button.position(windowWidth/2, windowHeight/2);
	button.mousePressed(Debug);
	*/
}

function Debug() {
	won = true
}

function draw() {
  background(0, 100, 0);
  drawGame();
	drawTime();
  updateAnimations();
  checkWinCondition();
}

class Card {
  constructor(suit, value) {
    this.suit = suit;
    this.value = value;
    this.faceUp = false;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.isAnimating = false;
  }

  display() {
    push();
    translate(this.x, this.y);
    if (this.faceUp) {
			// カードの表
      fill(255);
      stroke(0);
      strokeWeight(1);
      rect(0, 0, 70, 100, 8);
      
      // 柄と数字
      if (this.suit === '♥' || this.suit === '♦') {
        fill(220, 0, 0);
				stroke(220, 0, 0);
      } else {
        fill(0);
				stroke(0);
      }
      textSize(20);
      textAlign(CENTER);
      text(this.value, 15, 25);
      textSize(28);
      text(this.suit, 35, 65);
      
      // 選んだカードの縁はハイライト
      if (selectedCards.includes(this)) {
        noFill();
        stroke(255, 255, 0);
        strokeWeight(3);
        rect(0, 0, 70, 100, 8);
      }
    } else {
      // 裏側
      fill(30, 100, 200);
      stroke(0);
      rect(0, 0, 70, 100, 8);
      fill(20, 80, 180);
      for (let i = 10; i < 70; i += 25) {
        for (let j = 10; j < 100; j += 20) {
          circle(i, j, 10);
        }
      }
    }
    pop();
  }

  animateTo(targetX, targetY) { // カードの移動
    this.targetX = targetX;
    this.targetY = targetY;
    this.isAnimating = true;
    animatingCards.push(this);
  }

  isRed() { // ♥と♦は赤にする
    return this.suit === '♥' || this.suit === '♦';
  }
}

function initializeDeck() {
  const suits = ['♥', '♦', '♣', '♠'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
	// カードの作成
  for (let suit of suits) {
    for (let value of values) {
      deck.push(new Card(suit, value));
    }
  }
  
  // カードのシャッフル
  for (let i = deck.length - 1; i > 0; i--) { // Fisher-Yates Shuffle
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function dealCards() { // カードの配布
  for (let i = 0; i < 7; i++) {
    for (let j = i; j < 7; j++) {
      let card = deck.pop();
      if (i === j) {
        card.faceUp = true;
      }
      tables[j].push(card);
    }
  }
  
  // 余ったカードは山札へ
  stock = deck;
}

function drawGame() {
	// 山札
  if (stock.length > 0) {
    stock[stock.length - 1].x = 50;
    stock[stock.length - 1].y = 50;
    stock[stock.length - 1].display();
  } else {
    noFill();
    stroke(255);
    rect(50, 50, 70, 100, 5);
  }

  // 捨て札
  if (waste.length > 0) {
    let topCard = waste[waste.length - 1];
    topCard.x = 150;
    topCard.y = 50;
    topCard.display();
  }

  // 完成エリア
  for (let i = 0; i < 4; i++) {
    if (foundations[i].length > 0) {
      let topCard = foundations[i][foundations[i].length - 1];
      topCard.x = 350 + i * 100;
      topCard.y = 50;
      topCard.display();
    } else {
      noFill();
      stroke(255);
      rect(350 + i * 100, 50, 70, 100, 5);
    }
  }

  // 場札
  for (let i = 0; i < 7; i++) {
    if (tables[i].length === 0) {
      noFill();
      stroke(255);
      rect(50 + i * 100, 200, 70, 100, 5);
    } else {
      for (let j = 0; j < tables[i].length; j++) {
        let card = tables[i][j];
        card.x = 50 + i * 100;
        card.y = 200 + j * 30;
        card.display();
      }
    }
  }
}

function updateAnimations() {
  for (let i = animatingCards.length - 1; i >= 0; i--) {
    let card = animatingCards[i];
    let dx = card.targetX - card.x;
    let dy = card.targetY - card.y;
    
    card.x += dx * 0.2;
    card.y += dy * 0.2;
    
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) { // abs 絶対値
      card.x = card.targetX;
      card.y = card.targetY;
      card.isAnimating = false;
      animatingCards.splice(i, 1);
    }
  }
}

function drawTime() {
	let elapsedTime = (millis() - startTime) / 1000;
	let elapsedTimeFormatted = elapsedTime.toFixed(0);
	if (won) {
		textAlign(CENTER);
    textSize(40);
		stroke(255, 255, 0);
    fill(255, 255, 0);
		clearTime = elapsedTimeFormatted;
		text('Clear Time: '+ clearTime + ' s', width/2, height/2 + 50);
		text('Game Clear!', width/2, height/2 - 50);
		noLoop();
	} else {
		textSize(20);
		textAlign(RIGHT);
		fill(255);
		text("Time: " + elapsedTimeFormatted + " s", width - 50, height - 20);
	}
}

function checkWinCondition() {
  won = foundations.every(foundation => foundation.length === 13 && foundation[12].value === 'K');
}

function saveMove(from, to, cards, wasFlipped = false) {
  moves.push({
    from: from,
    to: to,
    cards: cards.slice(), // slice() 配列の一部をコピー
    wasFlipped: wasFlipped
  });
}

function undo() {
  if (moves.length === 0) return;
  
  let move = moves.pop(); // pop()でmovesの最後を参照
  let cards = move.cards.slice();
  
	// カードの移動先から削除
  for (let card of cards) {
    let index = move.to.indexOf(card); //indexOf() move.toからカードのインデックス(配列の順番)を取得
    if (index !== -1) {
      move.to.splice(index, 1);
    }
  }
  
  // カードを戻す
  move.from.push(...cards);
  
  // カードの向きを戻す
  if (move.wasFlipped && move.from.length > 0) {
    move.from[move.from.length - 1].faceUp = false; // length - 1 lengthで順番を取得 インデックスは0から始まるからインデックスとして使うには-1が必要
  }
}

function canPlaceOnFoundation(card, foundation) {
  if (foundation.length === 0) {
    return card.value === 'A';
  }
  let topCard = foundation[foundation.length - 1];
  let values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return card.suit === topCard.suit && values.indexOf(card.value) === values.indexOf(topCard.value) + 1;
}

function mousePressed() {
  if (keyIsDown(CONTROL)) {
    undo();
    return;
  }

  // 山札
  if (mouseX >= 50 && mouseX <= 120 && mouseY >= 50 && mouseY <= 150) {
    if (stock.length > 0) {
      let card = stock.pop();
      card.faceUp = true; // 最後のカードを表向ける
      waste.push(card); // 捨て札に追加
      card.animateTo(150, 50); // カードの移動
      saveMove(stock, waste, [card]); // 操作を記録
    } else { // 山札が空なら捨て札を山札に戻す
      stock = waste.reverse();
      waste = [];
      stock.forEach(card => card.faceUp = false);
      saveMove(waste, stock, stock.slice());
    }
    selectedCards = [];
    return;
  }

  // 捨て札
  if (waste.length > 0) {
    let topCard = waste[waste.length - 1];
    if (
      mouseX >= topCard.x && mouseX <= topCard.x + 70 && 
      mouseY >= topCard.y && mouseY <= topCard.y + 100
    ) {
      if (selectedCards.length > 0 && selectedPile === waste) { // 既に捨て札を選択していたらselectedをリセット
        selectedCards = [];
        selectedPile = null;
      } else {
        selectedCards = [topCard];
        selectedPile = waste;
      }
      return;
    }
  }

  // 完成エリア
  for (let i = 0; i < 4; i++) {
    if (
      mouseX >= 350 + i * 100 && mouseX <= 420 + i * 100 && 
      mouseY >= 50 && mouseY <= 150
    ) {
      if (selectedCards.length === 1) {
        let card = selectedCards[0];
        if (canPlaceOnFoundation(card, foundations[i])) { // カードを置けるか確認
          let sourcePile = selectedPile;
          selectedPile.pop();
          foundations[i].push(card); // 選択されたカードをfoundations[i]に移動
          card.animateTo(350 + i * 100, 50); // カードの移動
          saveMove(sourcePile, foundations[i], [card]);
        }
      }
      selectedCards = [];
      selectedPile = null;
      return;
    }
  }

  // テーブル
  for (let i = 0; i < 7; i++) {
    let table = tables[i];
		if (table.length === 0) {
      if (mouseX >= 50 + i * 100 && mouseX <= 120 + i * 100 && mouseY >= 200 && mouseY <= 300) {
        if (selectedCards.length > 0) {
            if (isValidTablePlacement(selectedCards, tables[i])) {
                let sourcePile = selectedPile;
                let startIndex = sourcePile.indexOf(selectedCards[0]);
                if (startIndex !== -1) {
                    sourcePile.splice(startIndex, selectedCards.length);
                    tables[i].push(...selectedCards);
                    selectedCards.forEach((card, index) => {
                        card.animateTo(50 + i * 100, 200 + (tables[i].length - selectedCards.length + index) * 30);
                    });
                    saveMove(sourcePile, tables[i], selectedCards);
                    selectedCards = [];
                    selectedPile = null;
                    return;
                }
            }
        }
    }
    

        
  } else {
			for (let j = table.length - 1; j >= 0; j--) {
				let card = table[j];
				if (mouseX >= card.x && mouseX <= card.x + 70 && mouseY >= card.y && mouseY <= card.y + 100) {
					if (card.faceUp) {
						if (selectedCards.length > 0) {
							if (canPlaceOntable(selectedCards[0], table)) {
								let sourcePile = selectedPile;
								let cardsToMove = selectedCards;
								selectedPile.splice(selectedPile.indexOf(selectedCards[0]));
								table.push(...cardsToMove);
								// forEach() 各要素に対して順番に処理
								cardsToMove.forEach((card, index) => { card.animateTo(50 + i * 100, 200 + (table.length - cardsToMove.length + index) * 30); });
								saveMove(sourcePile, table, cardsToMove);
							}
							selectedCards = [];
							selectedPile = null;
						} else {
							selectedCards = table.slice(j);
							selectedPile = table;
						}
					} else if (j === table.length - 1) {
						card.faceUp = true;
						saveMove(table, table, [card], true);
					}
					return;
				}
			}
		}
  }

  // カード以外をクリックすると選択解除
  selectedCards = [];
  selectedPile = null;
}

function canPlaceOntable(card, table) {
  if (table.length === 0) {
    return card.value === 'K';
  }
  let topCard = table[table.length - 1];
  let values = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'];
  return card.isRed() !== topCard.isRed() && values.indexOf(topCard.value) === values.indexOf(card.value) - 1;
}


function isValidSequence(cards) {
  if (cards.length === 0) return false;
  
  for (let i = 0; i < cards.length - 1; i++) {
      const currentCard = cards[i];
      const nextCard = cards[i + 1];
    	
			// 色の確認
      if (currentCard.isRed() === nextCard.isRed()) 
				return false;
    	
			// 数字の確認
      const values = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'];
      const currentIndex = values.indexOf(currentCard.value);
      const nextIndex = values.indexOf(nextCard.value);
      
      if (nextIndex !== currentIndex + 1) 
				return false;
  }
  
  return true;
}

function isValidTablePlacement(cards, targetPile) {
	// 空のテーブルに置けるのはキングのみ
  if (targetPile.length === 0) {
      return cards[0].value === 'K' && isValidSequence(cards);
  }
	
  const targetCard = targetPile[targetPile.length - 1];
  const firstCard = cards[0];
  
  const values = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'];
  
  return firstCard.isRed() !== targetCard.isRed() && 
         values.indexOf(targetCard.value) === values.indexOf(firstCard.value) - 1 && 
         isValidSequence(cards);
}
