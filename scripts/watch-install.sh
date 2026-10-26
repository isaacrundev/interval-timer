#!/usr/bin/env bash
# 把目前的程式碼直接裝到錶上: zeus bridge 的 connect + install
# (取代掃 QR code 的 zeus preview: 裝完直接開起來玩，不必再掃一次)
# 需要手機端的 Zepp app 開著 Bridge。
# exit 0 = 安裝成功, 3 = 手機端沒開 bridge, 4 = 逾時, 5 = bridge 斷線, 6 = 建置/安裝失敗
# 用法: bash scripts/watch-install.sh ["Amazfit Balance 2"]
set -u
cd "$(dirname "$0")/.." || exit 1
TARGET="${1:-Amazfit Balance 2}"

# zeus bridge 是 vorpal REPL, 一定要真 TTY, 所以用 expect 開一個 pty 餵指令
exec /usr/bin/expect -f /dev/stdin "$TARGET" <<'EXP'
set timeout 90
set target [lindex $argv 0]
spawn zeus bridge
expect -re {bridge\$ }
sleep 1 ;# 等 bridge 送出可連線清單, 太早下 connect 會踩到還沒設好的環境變數
send "connect\r"
expect {
  "No connectable online App or Simulator" { send "exit\r"; puts "\nNO_BRIDGE"; exit 3 }
  "Which online target would you like to connect?" { send "\r"; exp_continue }
  "successfully connected" { }
  timeout { puts "\nTIMEOUT_CONNECT"; exit 4 }
  eof { puts "\nEOF_CONNECT"; exit 5 }
}
send "install --target \"$target\"\r"
# 手錶回報才是真的裝好; 只等建置結束會太早斷線, 套件還在路上
expect {
  -re {Install .*result: success} { puts "\nPUSHED: $target" }
  -re {Install .*result: fail} { send "exit\r"; puts "\nINSTALL_FAIL"; exit 6 }
  "getting package failed" { send "exit\r"; puts "\nBUILD_FAIL"; exit 6 }
  timeout { puts "\nTIMEOUT_INSTALL"; exit 4 }
  eof { puts "\nEOF_INSTALL"; exit 5 }
}
sleep 1
send "exit\r"
expect eof
exit 0
EXP
