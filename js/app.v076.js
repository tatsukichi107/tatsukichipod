/* =========================================================
 * app.js（完全版・チェックポイント診断入り v0.76）
 *
 * 目的：
 * - 「新規/記憶でリボーンできない」＝処理途中で落ちて無反応になる問題を、
 *   スマホだけでも原因特定できるようにする。
 *
 * 仕様：
 * - 主要操作（新規/記憶/環境決定/カムバック）を try/catch で包む
 * - どこまで進んだか「チェックポイント」を画面下に表示
 * - 落ちたら alert で必ず理由を出す
 *
 * 注意：
 * - チェックポイント表示はデバッグ用。復旧したら消せる。
 * ========================================================= */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ===== Debug: checkpoint banner =====
  let cpBox = null;
  function ensureCpBox() {
    if (cpBox) return cpBox;
    cpBox = document.createElement("div");
    cpBox.style.position = "fixed";
    cpBox.style.left = "0";
    cpBox.style.right = "0";
    cpBox.style.bottom = "0";
    cpBox.style.zIndex = "99999";
    cpBox.style.padding = "8px 10px";
    cpBox.style.fontSize = "12px";
    cpBox.style.lineHeight = "1.35";
    cpBox.style.color = "white";
    cpBox.style.background = "rgba(0,0,0,0.75)";

