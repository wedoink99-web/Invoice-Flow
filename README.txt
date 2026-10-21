INVOICEFLOW - HOW TO BUILD THE WINDOWS EXE AND THE ANDROID APK ON GITHUB
=========================================================================

STEP 1 - Make a place for it on GitHub
  1. Go to github.com and sign in.
  2. Click the + at the top right, then "New repository".
  3. Name it:  invoiceflow   Choose "Private". Click "Create repository".

STEP 2 - Put these files in it
  1. Unzip invoiceflow-app.zip on your computer.
  2. On the new GitHub page click "uploading an existing file".
  3. Open the unzipped folder and drag EVERYTHING inside it onto the GitHub page
     (the folders .github, desktop, mobile, www and the .gitignore file).
     Wait until every file has finished uploading.
  4. Click the green "Commit changes" button.

STEP 3 - Let GitHub build it
  1. Click the "Actions" tab at the top. Two builds start by themselves:
     "Build Windows EXE" and "Build Android APK". Each takes about 5 to 10 minutes.
     (If nothing starts: click the build name on the left, then "Run workflow".)
  2. A green tick means it worked. Click the build, scroll to the bottom to
     "Artifacts" and click the name to download a zip.
       InvoiceFlow-Windows  ->  InvoiceFlow-Setup.exe  (installs like a normal program)
                                InvoiceFlow-Portable.exe (runs without installing)
       InvoiceFlow-Android  ->  InvoiceFlow.apk
  3. Unzip the downloads.

STEP 4 - Install
  Windows: double-click the file. If Windows says "Windows protected your PC",
           click "More info" and then "Run anyway" (it only says this because the
           program is not paid-for "signed").
  Android: send InvoiceFlow.apk to the phone, tap it, and allow "Install unknown apps"
           when asked.

IMPORTANT - YOUR DATA
  The EXE and the APK each keep their own data, separate from your web browser.
  The first time you open each one, go to Settings and either:
    - connect it to your Online sync (best, then everything matches everywhere), or
    - use "Restore from backup" with a backup file downloaded from your browser copy.

UPDATING LATER
  When you get a new InvoiceFlow.html from Claude: in your GitHub repository open
  the "www" folder, click index.html, click the pencil/"Upload" option and replace it
  with the new file (rename the new file to index.html first). Commit. The builds
  run again and give you new EXE and APK files.
