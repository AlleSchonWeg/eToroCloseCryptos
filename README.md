# eToro Close Crypto Script

[eToro][etoro] close cryptos is a [TamperMonkey][tm] script to close crypto trades if a provided price is reached. It's only testet with chrome, but should work with firefox too.

I tested this script only with the virtual portfolio, because i'm not a trader and i have no idea what is the best time to open a buy or sell trade. But it should work with the real portfolio.


# Installation instructions

  - Install TamperMonkey Extension for chrome from the [store][tm chrome].
  - Click this link to install the script: https://github.com/AlleSchonWeg/eToroCloseCryptos/raw/master/eToroCloseCryptos.user.js
  - Click install to confirm installation.

# Work with the script

To start working with the script, there are some points to notice:
- If you start the script you always ask if you want run it in demo mode. In demo mode the trades are not closed. The script only opens the close trade dialog and cancels the closing operation. At the first time i suggest to use the demo mode to see if the script is working as expected.
- The script only works at the manual trading page: https://www.etoro.com/portfolio/manual-trades and the sl, tp and current columns are needed. Make that sure.
- The website needs focus and active. That means you cannot open the manual-trades site in a tab and working in another tab. The page must visible and not hidden. If you have a second screen you can open the website there and working on the first screen.
- If the computer go to standby the script isn't working. I think this should be obvious.
- English userinterface is required.
- And very important: Everything you do, you do it at your own risk. I'm not responsible for any glitches, errors or accidentally closed trades.

Now we are ready.

- First open the manual trades page: https://www.etoro.com/portfolio/manual-trades. Press F5 and the button appear.
![Button](img/button.png "Button")
- Next Click the button and the website asks you, if you want demo mode or real mode.
![Confirm](img/confirm.png "Confirm")
If you click ok or cancel nothing started at this point. 
- Now the additional controls are visible on the page. A message shows you, if you running demo or real mode.
![Tradeslist](img/tradeslist.png "Tradeslist")
- At the screenshot above you see that only crypto rows have new controls. One textbox in green for tp and one in red for sl. On first init the textboxes are filled with there default values. On the left side a checkbox.
- Next you can fill the checkboxes with your tp and sl values. On buy positions close trade is raised if `current >=  tp` or `current <= sl`. On sell positions close trade is raised if `current <= tp` or `current >= sl`.
- At this point you are ready. The monitoring begins, if the checkbox has checked state. Price changes are only monitored on rows which are selected. Your values are stored in the local storage of the web page. This means, if you leave the page and come back later the values are not the default ones. Per default all checkboxed are unchecked if you revisit the manuel trades page. This make sure that no closing action is performed.

The script logs every activity and error to the console. Press F12 in chrome to open the developer tool, if you interested in whats going on.
![devtool](img/devtool.png "devtool")

   [etoro]: <https://www.etoro.com/>
   [tm]: <https://tampermonkey.net/>
   [tm chrome]: <https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=de>
