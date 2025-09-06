"use strict";

// =============================
// Neon Chess - Vanilla JS
// Full rules: legal moves, check, checkmate, stalemate, castling, en passant, promotion
// Two-player local play with Undo, Flip, Coordinates toggle, Move history
// =============================

// ---------- Utilities ----------
const deepClone = (value) => JSON.parse(JSON.stringify(value));

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const PIECE_TO_UNICODE = {
  w: { k: "\u2654", q: "\u2655", r: "\u2656", b: "\u2657", n: "\u2658", p: "\u2659" },
  b: { k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F" },
};

// Convert algebraic like "e4" to [fileIndex, rankIndex]
function algebraicToIndices(square) {
  const file = FILES.indexOf(square[0]);
  const rank = RANKS.indexOf(square[1]);
  return [file, rank];
}

function indicesToAlgebraic(fileIndex, rankIndex) {
  return `${FILES[fileIndex]}${RANKS[rankIndex]}`;
}

function isOnBoard(f, r) {
  return f >= 0 && f < 8 && r >= 0 && r < 8;
}

// ---------- Engine ----------
class ChessEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.loadFEN(INITIAL_FEN);
    this.history = [];
  }

  loadFEN(fen) {
    const [piecePlacement, activeColor, castling, enPassant, halfmove, fullmove] = fen.split(" ");
    const rows = piecePlacement.split("/");
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let rankFromTop = 0; rankFromTop < 8; rankFromTop++) {
      const row = rows[rankFromTop];
      let fileIndex = 0;
      for (const ch of row) {
        if (/[1-8]/.test(ch)) {
          fileIndex += parseInt(ch, 10);
        } else {
          const isWhite = ch === ch.toUpperCase();
          const type = ch.toLowerCase();
          const rankIndex = 7 - rankFromTop; // ranks ascend from White side
          this.board[fileIndex][rankIndex] = {
            type, // k q r b n p
            color: isWhite ? "w" : "b",
            hasMoved: false,
          };
          fileIndex += 1;
        }
      }
    }
    this.activeColor = activeColor; // 'w' or 'b'
    this.castlingRights = castling; // e.g., KQkq or -
    this.enPassantTarget = enPassant === "-" ? null : enPassant;
    this.halfmoveClock = parseInt(halfmove || "0", 10) || 0;
    this.fullmoveNumber = parseInt(fullmove || "1", 10) || 1;
  }

  pieceAt(square) {
    const [f, r] = algebraicToIndices(square);
    return this.board[f][r];
  }

  setPiece(square, piece) {
    const [f, r] = algebraicToIndices(square);
    this.board[f][r] = piece;
  }

  isSquareAttacked(square, byColor) {
    // Check if square is attacked by a piece of byColor
    const [targetF, targetR] = algebraicToIndices(square);
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const piece = this.board[f][r];
        if (!piece || piece.color !== byColor) continue;
        const from = indicesToAlgebraic(f, r);
        const moves = this.generatePseudoLegalMovesFrom(from, piece, true);
        if (moves.some((m) => m.to === square)) return true;
      }
    }
    return false;
  }

  inCheck(color) {
    const kingSquare = this.findKingSquare(color);
    return this.isSquareAttacked(kingSquare, color === "w" ? "b" : "w");
  }

  findKingSquare(color) {
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const p = this.board[f][r];
        if (p && p.type === "k" && p.color === color) {
          return indicesToAlgebraic(f, r);
        }
      }
    }
    throw new Error("King not found");
  }

  generateLegalMovesForSquare(from) {
    const [f, r] = algebraicToIndices(from);
    const piece = this.board[f][r];
    if (!piece || piece.color !== this.activeColor) return [];
    const pseudo = this.generatePseudoLegalMovesFrom(from, piece, false);
    // Filter moves that leave own king in check
    return pseudo.filter((mv) => this.isMoveLegal(mv));
  }

  isMoveLegal(move) {
    const snapshot = this.createSnapshot();
    this.applyMoveInternal(move, true);
    const stillInCheck = this.inCheck(snapshot.activeColor);
    this.restoreSnapshot(snapshot);
    return !stillInCheck;
  }

  createSnapshot() {
    return {
      board: deepClone(this.board),
      activeColor: this.activeColor,
      castlingRights: this.castlingRights,
      enPassantTarget: this.enPassantTarget,
      halfmoveClock: this.halfmoveClock,
      fullmoveNumber: this.fullmoveNumber,
    };
  }

  restoreSnapshot(snap) {
    this.board = deepClone(snap.board);
    this.activeColor = snap.activeColor;
    this.castlingRights = snap.castlingRights;
    this.enPassantTarget = snap.enPassantTarget;
    this.halfmoveClock = snap.halfmoveClock;
    this.fullmoveNumber = snap.fullmoveNumber;
  }

  applyMove(move) {
    // Public move application with history for undo
    const snapshot = this.createSnapshot();
    this.applyMoveInternal(move, false);
    this.history.push({ snapshot, move });
  }

  undo() {
    const last = this.history.pop();
    if (!last) return null;
    this.restoreSnapshot(last.snapshot);
    return last.move;
  }

  applyMoveInternal(move, simulateOnly) {
    // move: { from, to, piece, capture?, promotion?, isCastleKing?, isCastleQueen?, isEnPassant? }
    const { from, to } = move;
    const moving = this.pieceAt(from);

    // Update halfmove clock
    if (moving.type === "p" || move.capture) this.halfmoveClock = 0; else this.halfmoveClock += 1;

    // En passant capture removal
    if (move.isEnPassant) {
      const [toF, toR] = algebraicToIndices(to);
      const dir = moving.color === "w" ? -1 : 1;
      const capturedSquare = indicesToAlgebraic(toF, toR + dir);
      this.setPiece(capturedSquare, null);
    }

    // Handle castling rook move
    if (move.isCastleKing || move.isCastleQueen) {
      if (move.isCastleKing) {
        // King side: move rook from h to f
        const rank = moving.color === "w" ? "1" : "8";
        this.setPiece(`f${rank}`, this.pieceAt(`h${rank}`));
        this.setPiece(`h${rank}`, null);
      } else {
        // Queen side: move rook from a to d
        const rank = moving.color === "w" ? "1" : "8";
        this.setPiece(`d${rank}`, this.pieceAt(`a${rank}`));
        this.setPiece(`a${rank}`, null);
      }
    }

    // Move the piece
    this.setPiece(to, moving);
    this.setPiece(from, null);

    // Promotion
    if (move.promotion) {
      const promoted = { type: move.promotion, color: moving.color, hasMoved: true };
      this.setPiece(to, promoted);
    } else {
      const updated = this.pieceAt(to);
      if (updated) updated.hasMoved = true;
    }

    // Castling rights updates
    const color = moving.color;
    const opp = color === "w" ? "b" : "w";
    let rights = this.castlingRights.replace(/-/g, "");
    if (moving.type === "k") {
      rights = rights.replace(color === "w" ? /K|Q/g : /k|q/g, "");
    }
    if (moving.type === "r") {
      const fromSquare = from;
      if (fromSquare === "h1") rights = rights.replace(/K/g, "");
      if (fromSquare === "a1") rights = rights.replace(/Q/g, "");
      if (fromSquare === "h8") rights = rights.replace(/k/g, "");
      if (fromSquare === "a8") rights = rights.replace(/q/g, "");
    }
    // If rook captured
    if (move.capture) {
      const capturedFromTo = move.to;
      if (capturedFromTo === "h1") rights = rights.replace(/K/g, "");
      if (capturedFromTo === "a1") rights = rights.replace(/Q/g, "");
      if (capturedFromTo === "h8") rights = rights.replace(/k/g, "");
      if (capturedFromTo === "a8") rights = rights.replace(/q/g, "");
    }
    this.castlingRights = rights.length ? rights : "-";

    // En passant target update
    this.enPassantTarget = null;
    if (moving.type === "p") {
      const [fromF, fromR] = algebraicToIndices(from);
      const [toF, toR] = algebraicToIndices(to);
      if (Math.abs(toR - fromR) === 2) {
        // Set square jumped over
        const middleR = (fromR + toR) / 2;
        this.enPassantTarget = indicesToAlgebraic(fromF, middleR);
      }
    }

    // Active color and fullmove
    this.activeColor = this.activeColor === "w" ? "b" : "w";
    if (this.activeColor === "w") this.fullmoveNumber += 1;

    if (!simulateOnly) {
      // nothing extra
    }
  }

  generatePseudoLegalMovesFrom(from, piece, forAttackOnly) {
    // forAttackOnly: if true, generate attack squares only (used for isSquareAttacked)
    const moves = [];
    const [f, r] = algebraicToIndices(from);
    const color = piece.color;
    const forwardDir = color === "w" ? 1 : -1;
    const opponent = color === "w" ? "b" : "w";

    const push = (to, opts = {}) => {
      moves.push({ from, to, piece, ...opts });
    };

    const addRay = (df, dr) => {
      let nf = f + df;
      let nr = r + dr;
      while (isOnBoard(nf, nr)) {
        const target = this.board[nf][nr];
        const to = indicesToAlgebraic(nf, nr);
        if (!target) {
          push(to);
        } else {
          if (target.color !== color) push(to, { capture: true });
          break;
        }
        nf += df; nr += dr;
      }
    };

    switch (piece.type) {
      case "p": {
        // Forward pushes only when not calculating attack map
        if (!forAttackOnly) {
          const oneR = r + forwardDir;
          const oneTo = indicesToAlgebraic(f, oneR);
          if (isOnBoard(f, oneR) && !this.board[f][oneR]) {
            push(oneTo);
            const startRank = color === "w" ? 1 : 6;
            const twoR = r + 2 * forwardDir;
            if (r === startRank && !this.board[f][twoR]) {
              push(indicesToAlgebraic(f, twoR));
            }
          }
        }
        // Diagonal attacks
        for (const df of [-1, 1]) {
          const nf = f + df;
          const nr = r + forwardDir;
          if (!isOnBoard(nf, nr)) continue;
          const to = indicesToAlgebraic(nf, nr);
          if (forAttackOnly) {
            // For attack map, pawns attack diagonals regardless of occupancy
            push(to, { capture: true });
          } else {
            const target = this.board[nf][nr];
            if (target && target.color === opponent) {
              push(to, { capture: true });
            }
          }
        }
        // En passant only relevant for actual move generation
        if (!forAttackOnly && this.enPassantTarget) {
          const [epF, epR] = algebraicToIndices(this.enPassantTarget);
          if (epR === r + forwardDir && Math.abs(epF - f) === 1) {
            const to = indicesToAlgebraic(epF, epR);
            push(to, { capture: true, isEnPassant: true });
          }
        }
        break;
      }
      case "n": {
        const steps = [
          [1, 2], [2, 1], [2, -1], [1, -2],
          [-1, -2], [-2, -1], [-2, 1], [-1, 2],
        ];
        for (const [df, dr] of steps) {
          const nf = f + df, nr = r + dr;
          if (!isOnBoard(nf, nr)) continue;
          const target = this.board[nf][nr];
          const to = indicesToAlgebraic(nf, nr);
          if (!target) push(to); else if (target.color !== color) push(to, { capture: true });
        }
        break;
      }
      case "b": {
        addRay(1, 1); addRay(1, -1); addRay(-1, 1); addRay(-1, -1);
        break;
      }
      case "r": {
        addRay(1, 0); addRay(-1, 0); addRay(0, 1); addRay(0, -1);
        break;
      }
      case "q": {
        addRay(1, 0); addRay(-1, 0); addRay(0, 1); addRay(0, -1);
        addRay(1, 1); addRay(1, -1); addRay(-1, 1); addRay(-1, -1);
        break;
      }
      case "k": {
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            const nf = f + df, nr = r + dr;
            if (!isOnBoard(nf, nr)) continue;
            const target = this.board[nf][nr];
            const to = indicesToAlgebraic(nf, nr);
            if (!target) push(to); else if (target.color !== color) push(to, { capture: true });
          }
        }
        // Castling (only when not forAttackOnly)
        if (!forAttackOnly) {
          const rights = this.castlingRights;
          const rank = color === "w" ? "1" : "8";
          const enemy = color === "w" ? "b" : "w";
          const empty = (sq) => !this.pieceAt(sq);
          const safe = (sq) => !this.isSquareAttacked(sq, enemy);
          const canCastleKing = color === "w" ? /K/.test(rights) : /k/.test(rights);
          const canCastleQueen = color === "w" ? /Q/.test(rights) : /q/.test(rights);
          const kingStart = `e${rank}`;
          if (this.pieceAt(kingStart)) {
            if (canCastleKing) {
              if (empty(`f${rank}`) && empty(`g${rank}`) && safe(kingStart) && safe(`f${rank}`) && safe(`g${rank}`)) {
                push(`g${rank}`, { isCastleKing: true });
              }
            }
            if (canCastleQueen) {
              if (empty(`d${rank}`) && empty(`c${rank}`) && empty(`b${rank}`) && safe(kingStart) && safe(`d${rank}`) && safe(`c${rank}`)) {
                push(`c${rank}`, { isCastleQueen: true });
              }
            }
          }
        }
        break;
      }
    }

    // Add promotion flags for pawn moves reaching back rank
    if (piece.type === "p") {
      for (const mv of moves) {
        const [, toR] = algebraicToIndices(mv.to);
        if (toR === 7 || toR === 0) {
          mv.needsPromotion = true;
        }
      }
    }

    return moves;
  }

  allLegalMoves() {
    const color = this.activeColor;
    const all = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const piece = this.board[f][r];
        if (!piece || piece.color !== color) continue;
        const from = indicesToAlgebraic(f, r);
        const legal = this.generateLegalMovesForSquare(from);
        all.push(...legal);
      }
    }
    return all;
  }

  status() {
    const legal = this.allLegalMoves();
    const inCheck = this.inCheck(this.activeColor);
    if (legal.length === 0) {
      if (inCheck) return { type: "checkmate", winner: this.activeColor === "w" ? "b" : "w" };
      return { type: "stalemate" };
    }
    return { type: inCheck ? "check" : "ok" };
  }
}

// ---------- UI Controller ----------
class ChessUI {
  constructor(root) {
    this.root = root;
    this.engine = new ChessEngine();
    this.boardEl = document.getElementById("board");
    this.turnBadge = document.getElementById("turnBadge");
    this.moveList = document.getElementById("moveList");
    this.checkIndicator = document.getElementById("checkIndicator");
    this.promotionModal = document.getElementById("promotionModal");
    this.coordsToggle = document.getElementById("coordsToggle");
    this.effectLayer = document.getElementById("effectLayer");
    this.board3d = document.getElementById("board3d");
    this.confettiLayer = document.getElementById("confettiLayer");

    this.selectedSquare = null;
    this.legalTargets = new Map(); // toSquare -> move object
    this.orientation = "w"; // 'w' bottom, 'b' bottom

    this.bindControls();
    this.renderBoardStructure();
    this.renderPosition();
    this.playIntro();
  }

  bindControls() {
    document.getElementById("newGameBtn").addEventListener("click", () => {
      this.engine.reset();
      this.moveList.innerHTML = "";
      this.selectedSquare = null;
      this.orientation = "w";
      this.renderPosition();
      this.playIntro();
    });

    document.getElementById("undoBtn").addEventListener("click", () => {
      const undone = this.engine.undo();
      if (undone) {
        this.popHistory();
        this.selectedSquare = null;
        this.renderPosition();
      }
    });

    document.getElementById("flipBtn").addEventListener("click", () => {
      this.orientation = this.orientation === "w" ? "b" : "w";
      this.renderBoardStructure();
      this.renderPosition();
    });

    this.coordsToggle.addEventListener("change", () => {
      const show = this.coordsToggle.checked;
      this.root.classList.toggle("hide-coords", !show);
      this.renderBoardStructure();
      this.renderPosition();
    });
  }

  playIntro() {
    if (!this.board3d) return;
    this.board3d.classList.remove("intro");
    // Force reflow to restart animation
    void this.board3d.offsetWidth;
    this.board3d.classList.add("intro");
    // Remove the class after it finishes to keep interactions snappy
    setTimeout(() => {
      this.board3d.classList.remove("intro");
    }, 1450);

    // Confetti bursts synced with intro
    this.spawnConfettiBurst();
    setTimeout(() => this.spawnConfettiBurst(), 450);
    setTimeout(() => this.spawnConfettiBurst(), 900);
  }

  spawnConfettiBurst() {
    if (!this.confettiLayer) return;
    const layerRect = this.confettiLayer.getBoundingClientRect();
    const centerX = layerRect.width / 2;
    const topY = -20;
    const colors = ["#00f5ff", "#6a5cff", "#ff00d4", "#20f381", "#ffb020", "#ffffff"];
    const count = 60;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      const spread = layerRect.width * 0.42;
      const x = centerX + (Math.random() * 2 - 1) * 60;
      const y = topY + (Math.random() * 2 - 1) * 20;
      const dx = (Math.random() * 2 - 1) * spread;
      const dy = layerRect.height * (0.8 + Math.random() * 0.3);
      const rot = (Math.random() * 720 - 360) + "deg";
      const dur = 900 + Math.floor(Math.random() * 600);
      el.style.background = `linear-gradient(180deg, ${colors[i % colors.length]}, rgba(255,255,255,0.85))`;
      el.style.boxShadow = `0 0 10px ${colors[i % colors.length]}`;
      el.style.setProperty("--x", `${x}px`);
      el.style.setProperty("--y", `${y}px`);
      el.style.setProperty("--dx", `${dx}px`);
      el.style.setProperty("--dy", `${dy}px`);
      el.style.setProperty("--rot", rot);
      el.style.setProperty("--dur", `${dur}ms`);
      this.confettiLayer.appendChild(el);
      setTimeout(() => el.remove(), dur + 60);
    }
  }

  renderBoardStructure() {
    // rebuild squares according to orientation
    this.boardEl.innerHTML = "";
    const files = this.orientation === "w" ? FILES : [...FILES].reverse();
    const ranks = this.orientation === "w" ? [...RANKS].reverse() : RANKS;

    for (let r of ranks) {
      for (let f of files) {
        const square = `${f}${r}`;
        const fileIndex = FILES.indexOf(f);
        const rankIndex = RANKS.indexOf(r);
        const isDark = (fileIndex + rankIndex) % 2 === 1;
        const div = document.createElement("div");
        div.className = `square ${isDark ? "dark" : "light"}`;
        div.dataset.square = square;
        div.setAttribute("role", "gridcell");
        div.addEventListener("click", () => this.onSquareClick(square));

        // coordinates
        if (this.coordsToggle.checked) {
          if (f === files[0]) {
            const rankEl = document.createElement("span");
            rankEl.className = "coord rank";
            rankEl.textContent = r;
            div.appendChild(rankEl);
          }
          if (r === ranks[ranks.length - 1]) {
            const fileEl = document.createElement("span");
            fileEl.className = "coord file";
            fileEl.textContent = f;
            div.appendChild(fileEl);
          }
        }

        this.boardEl.appendChild(div);
      }
    }
  }

  renderPosition() {
    // Clear squares
    for (const sq of this.boardEl.querySelectorAll(".square")) {
      sq.classList.remove("selected", "highlight-move", "highlight-capture");
      sq.innerHTML = sq.querySelector(".coord") ? sq.querySelector(".coord").outerHTML : "";
    }

    // Pieces
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const piece = this.engine.board[f][r];
        if (!piece) continue;
        const square = indicesToAlgebraic(f, r);
        const sqEl = this.boardEl.querySelector(`[data-square="${square}"]`);
        if (!sqEl) continue;
        const glyph = PIECE_TO_UNICODE[piece.color][piece.type];
        const span = document.createElement("span");
        span.className = `piece ${piece.color === "w" ? "white" : "black"}`;
        span.textContent = glyph;
        sqEl.appendChild(span);
      }
    }

    // Status
    const status = this.engine.status();
    this.turnBadge.textContent = this.engine.activeColor === "w" ? "White to move" : "Black to move";
    this.checkIndicator.textContent = status.type === "check" ? "Check!" : status.type === "checkmate" ? "Checkmate" : status.type === "stalemate" ? "Stalemate" : "";
  }

  onSquareClick(square) {
    // If currently selecting a piece
    if (this.selectedSquare) {
      if (square === this.selectedSquare) {
        // Deselect
        this.clearHighlights();
        this.selectedSquare = null;
        return;
      }
      const move = this.legalTargets.get(square);
      if (move) {
        // Handle promotion if needed
        if (move.needsPromotion && !move.promotion) {
          this.openPromotionModal().then((promo) => {
            move.promotion = promo;
            this.commitMove(move);
          });
        } else {
          this.commitMove(move);
        }
        return;
      }
    }

    // Select new piece if it's the active color
    const piece = this.engine.pieceAt(square);
    if (piece && piece.color === this.engine.activeColor) {
      this.selectSquare(square);
    } else {
      // Empty or opponent piece without selection: ignore
    }
  }

  selectSquare(square) {
    this.clearHighlights();
    this.selectedSquare = square;
    const legal = this.engine.generateLegalMovesForSquare(square);
    const sqEl = this.boardEl.querySelector(`[data-square="${square}"]`);
    if (sqEl) sqEl.classList.add("selected");
    this.legalTargets.clear();
    for (const mv of legal) {
      this.legalTargets.set(mv.to, mv);
      const targetEl = this.boardEl.querySelector(`[data-square="${mv.to}"]`);
      if (!targetEl) continue;
      if (mv.capture) targetEl.classList.add("highlight-capture"); else targetEl.classList.add("highlight-move");
    }
  }

  clearHighlights() {
    this.legalTargets.clear();
    for (const sq of this.boardEl.querySelectorAll(".square")) {
      sq.classList.remove("selected", "highlight-move", "highlight-capture");
    }
  }

  commitMove(move) {
    const captureSquare = this.getCaptureSquare(move);
    this.engine.applyMove(move);
    this.pushHistory(move);
    this.selectedSquare = null;
    this.clearHighlights();
    this.renderPosition();
    if (captureSquare) this.spawnCaptureEffectsAt(captureSquare);
  }

  getCaptureSquare(move) {
    if (!move.capture) return null;
    if (move.isEnPassant) {
      const [toF, toR] = algebraicToIndices(move.to);
      const dir = move.piece.color === "w" ? -1 : 1;
      return indicesToAlgebraic(toF, toR + dir);
    }
    return move.to;
  }

  spawnCaptureEffectsAt(square) {
    const targetEl = this.boardEl.querySelector(`[data-square="${square}"]`);
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const containerRect = this.effectLayer.getBoundingClientRect();
    const cx = rect.left - containerRect.left + rect.width / 2;
    const cy = rect.top - containerRect.top + rect.height / 2;

    // Shockwave
    const shock = document.createElement("div");
    shock.className = "shockwave";
    shock.style.left = `${cx}px`;
    shock.style.top = `${cy}px`;
    this.effectLayer.appendChild(shock);
    setTimeout(() => shock.remove(), 650);

    // Particles
    const particleCount = 18;
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.4 - 0.2);
      const dist = rect.width * (0.35 + Math.random() * 0.35);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      p.style.setProperty("--dx", `${dx}px`);
      p.style.setProperty("--dy", `${dy}px`);
      this.effectLayer.appendChild(p);
      setTimeout(() => p.remove(), 520);
    }
  }

  pushHistory(move) {
    const notation = this.toSimpleNotation(move);
    const li = document.createElement("li");
    li.textContent = notation;
    this.moveList.appendChild(li);
    this.moveList.scrollTop = this.moveList.scrollHeight;
  }

  popHistory() {
    const last = this.moveList.lastElementChild;
    if (last) last.remove();
  }

  toSimpleNotation(move) {
    // Simple ALG-like: K e1-g1, exd5, e7-e8=Q, O-O, O-O-O
    const piece = move.piece;
    if (move.isCastleKing) return "O-O";
    if (move.isCastleQueen) return "O-O-O";
    const from = move.from;
    const to = move.to;
    let s = "";
    if (piece.type !== "p") s += piece.type.toUpperCase();
    if (move.capture) s += piece.type === "p" ? from[0] + "x" : "x";
    s += to;
    if (move.promotion) s += "=" + move.promotion.toUpperCase();
    const status = this.engine.status();
    if (status.type === "check") s += "+";
    if (status.type === "checkmate") s += "#";
    return s;
  }

  openPromotionModal() {
    return new Promise((resolve) => {
      this.promotionModal.classList.remove("hidden");
      const handler = (ev) => {
        const target = ev.target;
        if (!(target instanceof HTMLElement)) return;
        const type = target.getAttribute("data-piece");
        if (!type) return;
        cleanup();
        resolve(type);
      };
      const cleanup = () => {
        this.promotionModal.classList.add("hidden");
        for (const btn of this.promotionModal.querySelectorAll(".btn.promo")) {
          btn.removeEventListener("click", handler);
        }
      };
      for (const btn of this.promotionModal.querySelectorAll(".btn.promo")) {
        btn.addEventListener("click", handler);
      }
    });
  }
}

// ---------- Boot ----------
window.addEventListener("DOMContentLoaded", () => {
  new ChessUI(document.getElementById("app"));
});


