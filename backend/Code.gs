/**
 * @fileoverview Backend Kepegawaian
 */

// ==========================================
// 1. PENGATURAN ID
// ==========================================
var ROOT_FOLDER_ID = "1c3BoFGj_WD0v4JHi5kIoO324nt0t9IYC"; 
var TEMPLATE_ID = "1g6Ks90lPJd_MzTz0ZVNU6CwCod3DtMkXcA9-02O6OKo";
var BACKEND_FOLDER_ID = "1c3BoFGj_WD0v4JHi5kIoO324nt0t9IYC"; 
var SPT_FOLDER_ID = "1jbLrjc3GvQWLGw5LZM6s6YPV8rEKiDsU"; // ID Folder Khusus Arsip Surat Tugas
var CUTI_FOLDER_ID = "1EaJrRSKeRiSu6Dw_T0FeYF37Gtp5s_eh"; // ID Folder Khusus Arsip Cuti (Dari User)
var TARGET_SPREADSHEET_ID = "1bIQbiWAQ67TYFmvb3WZkvjJaN1moP1fQlmegsFZJWfI"; // ID Spreadsheet Utama

// ==========================================
// 2. FUNGSI PEMBANTU
// ==========================================
function getOrCreateSubFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}

function getNamaFolderPegawai(nip, fallbackNama) {
  try {
    const sheet = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID).getSheetByName("Data_Pegawai");
    if (!sheet) return fallbackNama;
    
    const rows = sheet.getDataRange().getValues();
    if (rows.length < 2) return fallbackNama;

    const headers = rows[0].map(h => h.toString().trim());
    const nipIdx = headers.indexOf("NIP");
    const namaFolderIdx = headers.indexOf("Nama_Folder");
    const namaIdx = headers.indexOf("Nama");

    if (namaFolderIdx === -1) return fallbackNama;

    for (let i = 1; i < rows.length; i++) {
      const rowNip = nipIdx !== -1 ? rows[i][nipIdx].toString().trim() : "";
      const rowNama = namaIdx !== -1 ? rows[i][namaIdx].toString().trim() : "";

      if ((nip && rowNip === nip) || (fallbackNama && rowNama === fallbackNama)) {
        const customFolderName = rows[i][namaFolderIdx] ? rows[i][namaFolderIdx].toString().trim() : "";
        if (customFolderName) return customFolderName;
      }
    }
  } catch (err) {
    Logger.log("Error getNamaFolderPegawai: " + err.message);
  }
  return fallbackNama;
}

function hitungHariDinas(tglBerangkat, tglPulang) {
  if (!tglBerangkat || !tglPulang || tglBerangkat === '-' || tglPulang === '-') return '-';
  
  function parseIndoDate(str) {
    var parts = str.toString().trim().split(' ');
    if (parts.length < 3) return null;
    var day = parseInt(parts[0], 10);
    var monthStr = parts[1].toLowerCase();
    var year = parseInt(parts[2], 10);
    var months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
    var month = -1;
    for (var i = 0; i < months.length; i++) {
      if (monthStr.indexOf(months[i]) !== -1) { month = i; break; }
    }
    if (month === -1) month = 0;
    return new Date(year, month, day);
  }
  
  var d1 = parseIndoDate(tglBerangkat);
  var d2 = parseIndoDate(tglPulang);
  
  if (d1 && d2) {
    var diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }
  return '-';
}

function getBulanTukinPlusSatu(periodeStr) {
  if (!periodeStr) return null;
  try {
    var parts = periodeStr.toString().split("s/d");
    var endDateStr = parts.length > 1 ? parts[1].trim() : parts[0].trim();
    
    var dateMatch = endDateStr.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (dateMatch) {
      var month = parseInt(dateMatch[2], 10); 
      month = month + 1; 
      if (month > 12) month = 1; 
      
      var bulanList = [
        "01_Januari", "02_Februari", "03_Maret", "04_April",
        "05_Mei", "06_Juni", "07_Juli", "08_Agustus",
        "09_September", "10_Oktober", "11_November", "12_Desember"
      ];
      return bulanList[month - 1];
    }
  } catch (e) {
    Logger.log("Error parse tukin month: " + e.message);
  }
  return null;
}

function getFormattedBulan(str) {
  if (!str) return "00_Periode";
  
  var bulanMap = {
    "januari": "01_Januari", "january": "01_Januari", "jan": "01_Januari",
    "februari": "02_Februari", "february": "02_Februari", "feb": "02_Februari",
    "maret": "03_Maret", "march": "03_Maret", "mar": "03_Maret",
    "april": "04_April", "apr": "04_April",
    "mei": "05_Mei", "may": "05_Mei",
    "juni": "06_Juni", "june": "06_Juni", "jun": "06_Juni",
    "juli": "07_Juli", "july": "07_Juli", "jul": "07_Juli",
    "agustus": "08_Agustus", "august": "08_Agustus", "agu": "08_Agustus", "aug": "08_Agustus",
    "september": "09_September", "sep": "09_September", "sept": "09_September",
    "oktober": "10_Oktober", "october": "10_Oktober", "okt": "10_Oktober", "oct": "10_Oktober",
    "november": "11_November", "nov": "11_November",
    "desember": "12_Desember", "december": "12_Desember", "des": "12_Desember", "dec": "12_Desember"
  };

  var textMatch = str.toString().match(/(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|May|June|July|August|October|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Agu|Sep|Sept|Oct|Okt|Nov|Dec|Des)/i);
  if (textMatch) {
    var key = textMatch[0].toLowerCase();
    if (bulanMap[key]) return bulanMap[key];
  }

  var bulanList = [
    "01_Januari", "02_Februari", "03_Maret", "04_April",
    "05_Mei", "06_Juni", "07_Juli", "08_Agustus",
    "09_September", "10_Oktober", "11_November", "12_Desember"
  ];

  var numMatch = str.toString().match(/[-/](\d{2})[-/]/) || str.toString().match(/[-/](\d{2})$/);
  if (numMatch) {
    var idx = parseInt(numMatch[1], 10) - 1;
    if (idx >= 0 && idx < 12) return bulanList[idx];
  }

  return "00_" + str;
}

// HELPER BARU: Normalisasi nilai tanggal (Date object ATAU string) menjadi
// format string konsisten "d bulan yyyy" (lowercase) agar key pembanding
// duplikat tidak meleset akibat perbedaan tipe data dari Google Sheets.
function normStr(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var d = val.getDate();
    var m = val.getMonth();
    var y = val.getFullYear();
    var months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    return d + " " + months[m] + " " + y;
  }
  return val.toString().trim().toLowerCase();
}

// ==========================================
// 3. GET DATA PEGAWAI & CEK EXISTING (doGet)
// ==========================================
function doGet(e) {
  try {
    if (e.parameter && e.parameter.action === 'health') {
      return json_({ status: 'success', service: 'kepegawaian', backendVersion: '2026-09-25-adjustment-monthly' });
    }
    if (e.parameter && e.parameter.action === 'checkExisting') {
      return json_(existingSubmission_({ modul: e.parameter.modul, nip: e.parameter.nip,
        nama: e.parameter.nama, periode: e.parameter.periodeEvent }));
    }

    const sheet = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID).getSheetByName("Data_Pegawai");
    const rows = sheet.getDataRange().getValues();
    if (rows.length < 2) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    
    const headers = rows[0].map(h => h.toString().trim());
    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(cell => cell === '')) continue;
      const item = {};
      for (let j = 0; j < headers.length; j++) {
        item[headers[j]] = row[j] !== undefined ? row[j].toString().trim() : '';
      }
      data.push(item);
    }
    
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 4. POST DATA (SIMPAN DATA / CEK STATUS)
// ==========================================
function legacyDoPost_(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    
    if (payload.action === 'check_status') {
      return json_(existingSubmission_(payload));
    }

    var modul = payload.modul;
    var nip = payload.nip ? payload.nip.toString().trim() : "Tanpa_NIP";
    var nama = payload.nama ? payload.nama.toString().trim() : "Tanpa_Nama";
    var periode = payload.periode; 
    var bulanTahun = payload.bulanTahun; 
    var fileName = payload.fileName;
    var fileBase64 = payload.fileBase64;
    var ringkasan = payload.ringkasan || {};
    
    var folderPegawaiName = payload.namaFolder ? payload.namaFolder.toString().trim() : getNamaFolderPegawai(nip, nama);
    var individuFolder; 

    // ========================================================
    // LOGIKA KHUSUS: MODUL ARSIP SURAT TUGAS (SPT) & CUTI
    // ========================================================
    if (modul === 'spt' || modul === 'cuti') {
      return json_(saveArchive_(payload));
    }

    // ========================================================
    // LOGIKA LAMA: UANG MAKAN & TUNJANGAN KINERJA
    // ========================================================
    else {
      var formattedBulan = "";
      
      if (modul === "tukin") {
        formattedBulan = getBulanTukinPlusSatu(periode);
        if (!formattedBulan) {
          formattedBulan = getFormattedBulan(bulanTahun) || getFormattedBulan(periode);
        }
      } else {
        formattedBulan = getFormattedBulan(bulanTahun) || getFormattedBulan(periode);
      }

      var labelModul = (modul === "uang-makan" ? "Uang Makan" : "Tunjangan Kinerja");
      var folderPeriodeName = labelModul + "_" + formattedBulan;

      var previousPresensi = submissionRecord_(payload);
      individuFolder = resolvePresensiFolder_(payload);
      // Tidak menghapus isi folder. Salinan SPT/Cuti dan file lain tetap utuh.

      // Tab 2 consumes parsed data only. The reference PDF/XLSX stays on the user's device.

      var newSpreadsheetName = "Riwayat_Presensi_" + folderPegawaiName + "_" + labelModul + "_" + formattedBulan;
      var targetSpreadsheetId = DriveApp.getFileById(TEMPLATE_ID).makeCopy(newSpreadsheetName, individuFolder).getId();
      var fileUrl = 'https://docs.google.com/spreadsheets/d/' + targetSpreadsheetId + '/edit';
      var workingSheet = SpreadsheetApp.openById(targetSpreadsheetId).getSheets()[0]; 

      workingSheet.getRange("A2").setValue(nama + " - " + nip);

      if (payload.sheetData && payload.sheetData.length > 0) {
        var numRows = payload.sheetData.length;
        var numCols = payload.sheetData[0].length; 
        
        workingSheet.getRange(6, 1, numRows, numCols).setValues(payload.sheetData);
        workingSheet.getRange(6 + numRows, 1).setValue("TOTAL");

        var backgrounds = []; 
        for (var i = 0; i < numRows; i++) {
          var isLibur = (payload.sheetData[i][1] === 'Sabtu' || payload.sheetData[i][1] === 'Minggu' || payload.sheetData[i][21] === 'Libur');
          var rowColor = isLibur ? '#f4cccc' : null;
          var rowBackgrounds = [];
          for (var j = 0; j < numCols; j++) rowBackgrounds.push(rowColor);
          backgrounds.push(rowBackgrounds);
        }
        workingSheet.getRange(6, 1, numRows, numCols).setBackgrounds(backgrounds);
      }

      saveTab2Baseline_(SpreadsheetApp.openById(targetSpreadsheetId), workingSheet, payload.sheetData);
      writeAttendanceFlags_(workingSheet, payload.sheetData.map(function(row) {
        return { tanggal: isoDate_(row[2]), keterangan: row[21] };
      }));
      var masterSheet = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID).getSheetByName(modul === "uang-makan" ? "REKAP_UANG_MAKAN" : "REKAP_TUKIN");
      if (!masterSheet) throw new Error("Sheet rekap presensi tidak ditemukan.");
      if (masterSheet) {
        var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

        // Perbaiki Format NIP di Sini juga untuk Uang Makan dan Tukin
        var safeNip = "'" + nip.toString().trim();

        var dataToInsert = modul === "uang-makan" 
          ? [timestamp, safeNip, nama, periode, ringkasan.totalHariKalender || 31, ringkasan.totalHariMasuk || 0, ringkasan.totalJamKerja || "-", fileUrl, individuFolder.getUrl(), targetSpreadsheetId]
          : [timestamp, safeNip, nama, periode, ringkasan.totalHariMasuk || 0, ringkasan.totalTelat || "0", ringkasan.totalPSW || "0", fileUrl, individuFolder.getUrl(), targetSpreadsheetId];
        
        var values = masterSheet.getDataRange().getValues();
        var rowIndexToUpdate = -1;
        for (var i = values.length - 1; i >= 1; i--) { 
          if (nip_(values[i][1]) === nip_(nip) && values[i][3].toString().trim() === periode.toString().trim()) { 
            rowIndexToUpdate = i + 1; 
            break; 
          }
        }
        
        if (rowIndexToUpdate !== -1) {
           masterSheet.getRange(rowIndexToUpdate, 1, 1, dataToInsert.length).setValues([dataToInsert]);
        } else {
           // Mencegah out of bounds saat append
           var actualLastRow = 1;
           var nipColData = masterSheet.getRange("B:B").getValues();
           for (var r = nipColData.length - 1; r >= 0; r--) {
              if (nipColData[r][0] && nipColData[r][0].toString().trim() !== "") {
                 actualLastRow = r + 1;
                 break;
              }
           }
           var targetRow = actualLastRow + 1;
           if (targetRow > masterSheet.getMaxRows()) {
               masterSheet.insertRowAfter(actualLastRow);
           }
           masterSheet.getRange(targetRow, 1, 1, dataToInsert.length).setValues([dataToInsert]);
        }
      }

      // Keep any legacy original upload; retire only the previously generated recap.
      invalidateCalculation_(submissionRecord_(payload));
      retirePreviousPresensi_(previousPresensi && Object.assign({}, previousPresensi, { presensiId: '' }), individuFolder, '', targetSpreadsheetId);
      return json_({ status: "success", message: "Berhasil!", folderId: individuFolder.getId(), folderUrl: individuFolder.getUrl(), spreadsheetId: targetSpreadsheetId });
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 5. FUNGSI AUTO SORT (TAMBAHAN)
// ==========================================
function sortRekapSheets() {
  var ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID); 
  
  // Memasukkan variasi nama sheet yang ada di pertanyaan sebelumnya
  var targetSheets = ["REKAP_CUTI", "REKAP_SPT", "REKAP _SPT"];
  
  for (var i = 0; i < targetSheets.length; i++) {
    var sheet = ss.getSheetByName(targetSheets[i]);
    
    // Pastikan sheet ditemukan dan memiliki data selain header
    if (sheet && sheet.getLastRow() > 1) {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      
      // Ambil range data mulai dari baris 2 (mengabaikan header di baris 1)
      var range = sheet.getRange(2, 1, lastRow - 1, lastCol);
      
      // Mengurutkan berdasarkan kolom E (kolom ke-5) secara Descending (terbaru di atas)
      range.sort({column: 5, ascending: false});
    }
  }
}


function saveArchive_(payload) {
  var modul = payload.modul, fileName = payload.fileName, fileBase64 = payload.fileBase64;
  if (!fileName || !fileBase64 || !Array.isArray(payload.sptData) || !payload.sptData.length) throw new Error('File dan data arsip diperlukan.');
  var mime = mimeForName_(fileName);
  if (['application/pdf', 'image/jpeg', 'image/png'].indexOf(mime) === -1) throw new Error('Format arsip harus PDF/JPG/PNG.');
  if (fileBase64.length > 14 * 1024 * 1024) throw new Error('Ukuran berkas melebihi 10 MB.');
      var isSpt = modul === 'spt';
      // Gunakan Folder Cuti yang baru jika modul = cuti
      var targetBaseFolder = isSpt ? DriveApp.getFolderById(SPT_FOLDER_ID) : DriveApp.getFolderById(CUTI_FOLDER_ID);
      
      // 1. Ekstrak nama folder (Tahun_BulanDigit_Bulan) dari tanggal pulang
      var targetFolderName = "Arsip_Umum";
      if (payload.sptData && payload.sptData.length > 0) {
        var samplePulang = payload.sptData[0].tanggalPulang || '-';
        if (samplePulang !== '-') {
          var parts = samplePulang.toString().trim().split(' ');
          if (parts.length >= 3) {
            var bulanNama = parts[1]; // misal: "Agustus"
            var tahunStr = parts[2];  // misal: "2026"
            
            // Mapping nama bulan ke 2 digit angka
            var bulanIndo = {
              "januari": "01", "februari": "02", "maret": "03", "april": "04",
              "mei": "05", "juni": "06", "juli": "07", "agustus": "08",
              "september": "09", "oktober": "10", "november": "11", "desember": "12"
            };
            var bulanDigit = bulanIndo[bulanNama.toLowerCase()] || "00";
            
            // Output Baru: 2026_08_Agustus
            targetFolderName = tahunStr + "_" + bulanDigit + "_" + bulanNama; 
          }
        }
      }

      // 2. Buat / Ambil Folder target
      var subFolder = getOrCreateSubFolder(targetBaseFolder, targetFolderName);

      // Sumber arsip dipertahankan; tidak menghapus file lama berdasarkan nama.
      // 4. Decode & Simpan File PDF baru
      var blob = Utilities.newBlob(Utilities.base64Decode(fileBase64), mimeForName_(fileName), fileName);
      var file = subFolder.createFile(blob);
      var fileUrl = file.getUrl();

      // Opsional: Buat file bisa dibaca agar link tidak memunculkan "Request Access"
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (sharingErr) {
        Logger.log("Gagal setSharing: " + sharingErr.message);
      }

      var spreadSheetError = null;

      try {
        // 5. Buka Spreadsheet Target & Sheet yang sesuai (REKAP_SPT atau REKAP_CUTI)
        var ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
        var sheetName = isSpt ? 'REKAP_SPT' : 'REKAP_CUTI';
        var sheet = ss.getSheetByName(sheetName); 
        
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
          // HEADER BARU
          var headerLabel = isSpt ? 'Tujuan' : 'Jenis Cuti';
          var hariLabel = isSpt ? 'Jumlah Hari Dinas' : 'Jumlah Hari Cuti';
          sheet.appendRow(['Timestamp', 'NIP', 'Nama', headerLabel, 'Tanggal Mulai', 'Tanggal Selesai', hariLabel, 'Bulan', 'Tahun', 'Link Arsip']);
          sheet.getRange('A1:J1').setFontWeight('bold').setBackground('#084C61').setFontColor('#FFFFFF');
          sheet.setFrozenRows(1);
        }

        // 6. Tulis Data (DIREVISI AGAR TIDAK TERSASAR KE BARIS BAWAH & ANTI-DUPLIKAT)
        if (payload.sptData && payload.sptData.length > 0) {
          var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
          
          // GUNAKAN getValues() karena getDisplayValues() sangat berat untuk sheet besar
          var existingData = sheet.getDataRange().getValues();
          var dataMap = {}; 
          
          // Memetakan baris eksisting berdasarkan Kunci Unik: NIP_Berangkat_Pulang_Tujuan/JenisCuti
          // normStr() dipakai supaya Date object dari Sheets vs String dari Frontend
          // tetap cocok saat dibandingkan, sehingga baris lama benar-benar ter-overwrite
          // (bukan malah dianggap baris baru / duplikat).
          for (var i = 1; i < existingData.length; i++) {
              var exNip = nip_(existingData[i][1]);
              if (exNip === "" || exNip === "NIP") continue; 
              
              var exTujuan = existingData[i][3] ? existingData[i][3].toString().trim().toLowerCase() : "";
              var exBerangkat = normStr(existingData[i][4]);
              var exPulang = normStr(existingData[i][5]);
              
              var key = exNip + "_" + exBerangkat + "_" + exPulang + "_" + exTujuan;
              dataMap[key] = i + 1; 
          }

          // Pencarian baris terakhir di Spreadsheet (Akurat, membaca dari bawah)
          var actualLastRow = 1;
          var nipColData = sheet.getRange("B:B").getValues();
          for (var r = nipColData.length - 1; r >= 0; r--) {
             if (nipColData[r][0] && nipColData[r][0].toString().trim() !== "") {
                actualLastRow = r + 1;
                break;
             }
          }

          for (var k = 0; k < payload.sptData.length; k++) {
            var item = payload.sptData[k];
            var tglBerangkat = item.tanggalBerangkat || '-';
            var tglPulang = item.tanggalPulang || '-';
            var tujuan = item.tujuan || '-';
            var jmlHari = item.jumlahHariDinas || hitungHariDinas(tglBerangkat, tglPulang);
            
            var bulanSurat = item.bulan && item.bulan !== "-" ? item.bulan : "-";
            var tahunSurat = item.tahun && item.tahun !== "-" ? item.tahun : "-";
            
            // Fallback parsing manual untuk bulan dan tahun
            if (bulanSurat === "-" && tglPulang !== "-") {
              var splitted = tglPulang.toString().trim().split(' ');
              if (splitted.length >= 3) {
                bulanSurat = splitted[1]; 
                tahunSurat = splitted[2];
              } else if (splitted.length >= 2) {
                bulanSurat = splitted[1];
              }
            }
            
            var formattedNip = "'" + (item.nip || "-");

            var rowData = [
              timestamp,       
              formattedNip,    
              item.nama || "-",
              tujuan,          
              tglBerangkat,    
              tglPulang,       
              jmlHari,         
              bulanSurat,      
              tahunSurat,      
              fileUrl          
            ];

            var rawNip = (item.nip || "-").toString().trim();
            var rawTujuan = tujuan.toString().trim().toLowerCase();
            var normBerangkat = normStr(tglBerangkat);
            var normPulang = normStr(tglPulang);
            
            var checkKey = rawNip + "_" + normBerangkat + "_" + normPulang + "_" + rawTujuan;
            
            if (dataMap[checkKey]) {
              // Overwrite jika kombinasi NIP & Tanggal & Tujuan/Jenis Cuti sudah ada
              sheet.getRange(dataMap[checkKey], 1, 1, rowData.length).setValues([rowData]);
            } else {
              // Tambah baris dengan mencegah out-of-bounds error
              var targetRow = actualLastRow + 1;
              if (targetRow > sheet.getMaxRows()) {
                 sheet.insertRowAfter(actualLastRow);
              }
              sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
              dataMap[checkKey] = targetRow; 
              actualLastRow = targetRow; // Update index baris terakhir
            }
            writeDateColumns_(sheet, dataMap[checkKey], 11, archiveDateList_(tglBerangkat, tglPulang, modul));
          }
        }
      } catch (sheetError) {
        spreadSheetError = sheetError.message;
      }

      if (spreadSheetError) {
        // Mengembalikan peringatan JSON jika spreadsheet error, sehingga Frontend tidak meledak (HTML Error)
        return { 
          status: "error", // Jangan mengonfirmasi sukses bila rekap arsip gagal
          message: "Perhatian: File berhasil disimpan di Drive, TETAPI gagal merekap di Spreadsheet. Error: " + spreadSheetError, 
          folderUrl: subFolder.getUrl(),
          fileUrl: fileUrl,
          fileId: file.getId()
        };
      }

      // === MENGAKTIFKAN AUTO-SORT SEBELUM RESPONSE SUCCESS ===
      try {
        sortRekapSheets();
      } catch (sortErr) {
        Logger.log("Gagal auto-sort: " + sortErr.message);
      }
      // =========================================================

      return { 
        status: "success", 
        message: "Arsip Berhasil Disimpan & Direkap!", 
        folderUrl: subFolder.getUrl(),
        fileUrl: fileUrl,
          fileId: file.getId()
      };

}


// Internal implementation. Included in the complete Code.gs deliverable.
var ATTACHMENT_SHEET = 'DOKUMEN_PENDUKUNG';
var ATTACHMENT_HEADERS = ['Timestamp', 'Modul', 'NIP', 'Nama', 'Periode', 'FolderId', 'FileId', 'FileName', 'JenisDokumen', 'SourceFileId', 'SourceUrl', 'Origin', 'Status', 'RequestId'];

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function nip_(value) { return String(value || '').replace(/[\s'"]/g, ''); }
function text_(value) { return String(value || '').trim(); }
function driveId_(value) {
  var text = text_(value);
  if (/^[\w-]{10,}$/.test(text)) return text;
  var match = text.match(/\/(?:d|folders)\/([\w-]+)/) || text.match(/[?&]id=([\w-]+)/);
  return match ? match[1] : '';
}
function hasOnlyParent_(file, folderId) {
  var parents = file.getParents(), count = 0, matched = false;
  while (parents.hasNext()) { var parent = parents.next(); count++; matched = parent.getId() === folderId; }
  return count === 1 && matched;
}
function folderUnder_(folder, ancestorId, seen) {
  if (folder.getId() === ancestorId) return true;
  seen = seen || {};
  if (seen[folder.getId()]) return false;
  seen[folder.getId()] = true;
  var parents = folder.getParents();
  while (parents.hasNext()) if (folderUnder_(parents.next(), ancestorId, seen)) return true;
  return false;
}
function fileUnder_(file, ancestorId) {
  var parents = file.getParents();
  while (parents.hasNext()) if (folderUnder_(parents.next(), ancestorId)) return true;
  return false;
}
function eventSheetName_(modul) {
  if (modul === 'uang-makan') return 'REKAP_UANG_MAKAN';
  if (modul === 'tukin') return 'REKAP_TUKIN';
  throw new Error('Modul pengumpulan tidak valid.');
}
function submissionRecord_(payload) {
  var sheet = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID).getSheetByName(eventSheetName_(payload.modul));
  if (!sheet) return null;
  var rows = sheet.getDataRange().getValues();
  var wantedNip = nip_(payload.nip), wantedName = text_(payload.nama).toLowerCase();
  if (!wantedNip && !wantedName) throw new Error('Identitas pegawai dari tab 2 diperlukan.');
  if (!text_(payload.periode)) throw new Error('Periode pengumpulan diperlukan.');
  for (var i = rows.length - 1; i >= 1; i--) {
    var identityMatch = wantedNip ? nip_(rows[i][1]) === wantedNip : text_(rows[i][2]).toLowerCase() === wantedName;
    if (identityMatch && text_(rows[i][3]) === text_(payload.periode)) {
      return { nip: nip_(rows[i][1]), nama: text_(rows[i][2]), periode: text_(rows[i][3]), modul: payload.modul,
        folderId: driveId_(rows[i][8]), presensiId: driveId_(rows[i][7]), spreadsheetId: driveId_(rows[i][9]) };
    }
  }
  return null;
}
function recordedFolder_(record) {
  if (!record || !record.folderId || !record.spreadsheetId) throw new Error('Simpan rekap presensi pada tab 2 terlebih dahulu.');
  var folder = DriveApp.getFolderById(record.folderId);
  if (folder.isTrashed() || !folderUnder_(folder, ROOT_FOLDER_ID)) throw new Error('Folder rekap berada di luar folder pengumpulan.');
  var spreadsheet = DriveApp.getFileById(record.spreadsheetId);
  if (spreadsheet.isTrashed() || !hasOnlyParent_(spreadsheet, folder.getId())) throw new Error('Lokasi file rekap tab 2 tidak sesuai. Periksa folder rekap.');
  return folder;
}
// Read current master rows and the generated recap, never the original reference file.
function existingSubmission_(payload) {
  var record = submissionRecord_(payload), exists = false;
  if (record && record.folderId && record.spreadsheetId) {
    try {
      var folder = DriveApp.getFolderById(record.folderId);
      var file = DriveApp.getFileById(record.spreadsheetId);
      exists = !folder.isTrashed() && folderUnder_(folder, ROOT_FOLDER_ID) &&
        !file.isTrashed() && hasOnlyParent_(file, folder.getId()) &&
        file.getMimeType() === 'application/vnd.google-apps.spreadsheet';
    } catch (error) {
      // Missing or inaccessible IDs are not verified existing documents. Quota/service
      // failures must surface as errors, not silently look like an absent recap.
      if (!/No (?:file|folder)|not found|could not be found|could be found|does not exist|access denied|permission|tidak ditemukan/i.test(error.message)) throw error;
      Logger.log('Rekap tidak tersedia atau tidak dapat diverifikasi: ' + error.message);
    }
  }
  return { status: 'success', exists: exists, isUploaded: exists, checkedLive: true };
}
function resolvePresensiFolder_(payload) {
  var previous = submissionRecord_(payload);
  // A manually removed recap must not prevent saving a replacement in its valid folder.
  if (previous && previous.folderId) {
    var previousFolder = null;
    try { previousFolder = DriveApp.getFolderById(previous.folderId); } catch (error) { Logger.log('Folder lama tidak tersedia: ' + error.message); }
    if (previousFolder && !previousFolder.isTrashed()) {
      if (!folderUnder_(previousFolder, ROOT_FOLDER_ID)) throw new Error('Folder rekap berada di luar folder pengumpulan.');
      return previousFolder;
    }
  }
  var modul = payload.modul;
  var month = modul === 'tukin' ? getBulanTukinPlusSatu(payload.periode) : null;
  month = month || getFormattedBulan(payload.bulanTahun || payload.periode);
  var category = getOrCreateSubFolder(DriveApp.getFolderById(ROOT_FOLDER_ID), modul === 'uang-makan' ? 'BUKTI_UANG_MAKAN' : 'BUKTI_TUNJANGAN_KINERJA');
  var periodFolder = getOrCreateSubFolder(category, (modul === 'uang-makan' ? 'Uang Makan' : 'Tunjangan Kinerja') + '_' + month);
  return getOrCreateSubFolder(periodFolder, getNamaFolderPegawai(nip_(payload.nip), text_(payload.nama)));
}
function registry_(create) {
  var ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID), sheet = ss.getSheetByName(ATTACHMENT_SHEET);
  if (!sheet && create) { sheet = ss.insertSheet(ATTACHMENT_SHEET); sheet.appendRow(ATTACHMENT_HEADERS); sheet.setFrozenRows(1); }
  return sheet;
}
function registryRows_() {
  var sheet = registry_(false);
  if (!sheet) return [];
  return sheet.getDataRange().getValues().slice(1).map(function(row, index) {
    return { row: index + 2, values: row, modul: text_(row[1]), nip: nip_(row[2]), nama: text_(row[3]), periode: text_(row[4]),
      folderId: text_(row[5]), fileId: text_(row[6]), fileName: text_(row[7]), jenisDokumen: text_(row[8]),
      sourceFileId: text_(row[9]), sourceUrl: text_(row[10]), origin: text_(row[11]), status: text_(row[12]), requestId: text_(row[13]) };
  });
}
function sameScope_(entry, record) {
  return entry.modul === record.modul && entry.nip === record.nip && entry.periode === record.periode && entry.folderId === record.folderId;
}
function documentView_(entry, file) {
  return { fileId: file.getId(), fileName: file.getName(), fileUrl: file.getUrl(), previewUrl: 'https://drive.google.com/file/d/' + file.getId() + '/preview',
    folderId: entry.folderId, jenisDokumen: entry.jenisDokumen, sourceFileId: entry.sourceFileId, sourceUrl: entry.sourceUrl, origin: entry.origin };
}
function liveAttachment_(entry) {
  if (entry.status !== 'active' || !entry.fileId || entry.fileId === entry.sourceFileId) return null;
  try {
    var file = DriveApp.getFileById(entry.fileId);
    return !file.isTrashed() && hasOnlyParent_(file, entry.folderId) ? file : null;
  } catch (error) { return null; }
}
function listAttachments_(payload) {
  var record = submissionRecord_(payload);
  if (!record) return { status: 'success', documents: [], requiresTab2: true };
  var folder = recordedFolder_(record), documents = [];
  registryRows_().forEach(function(entry) {
    if (!sameScope_(entry, record)) return;
    var file = liveAttachment_(entry);
    if (file) documents.push(documentView_(entry, file));
  });
  var processed = false;
  try { var state = finalState_(payload); processed = processedState_(state); } catch (error) { /* List/delete must remain usable to repair invalid evidence. */ }
  return { status: 'success', documents: documents, folderUrl: folder.getUrl(), requiresTab2: false, processed: processed };
}
function parseDate_(value) {
  // Read native sheet dates in the spreadsheet's timezone, never the script timezone.
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    value = Utilities.formatDate(value, SpreadsheetApp.openById(TARGET_SPREADSHEET_ID).getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  if (typeof value === 'number' && isFinite(value)) value = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000).toISOString().slice(0, 10);
  var raw = text_(value), parts = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/), day, month, year;
  if (parts) { year = +parts[1]; month = +parts[2]; day = +parts[3]; }
  else if ((parts = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) { day = +parts[1]; month = +parts[2]; year = +parts[3]; }
  else if ((parts = raw.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/))) {
    day = +parts[1]; year = +parts[3]; month = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'].indexOf(parts[2]) + 1;
  } else return null;
  var date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}
function overlaps_(startValue, endValue, period) {
  var range = period.split(/\s*s\/d\s*/i), start = parseDate_(startValue), end = parseDate_(endValue || startValue);
  var periodStart = parseDate_(range[0]), periodEnd = parseDate_(range[1]);
  return !!(start && end && periodStart && periodEnd && end >= start && start <= periodEnd && end >= periodStart);
}
function validArchiveSource_(source, type, record) {
  var archiveRoot = type === 'spt' ? SPT_FOLDER_ID : CUTI_FOLDER_ID;
  if (source.isTrashed() || !fileUnder_(source, archiveRoot)) throw new Error('Dokumen sumber bukan arsip ' + type.toUpperCase() + ' yang valid.');
  var ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  var sheet = ss.getSheetByName(type === 'spt' ? 'REKAP_SPT' : 'REKAP_CUTI');
  if (!sheet && type === 'spt') sheet = ss.getSheetByName('REKAP _SPT');
  var rows = sheet ? sheet.getDataRange().getValues() : [];
  var valid = rows.slice(1).some(function(row) {
    return nip_(row[1]) === record.nip && driveId_(row[9]) === source.getId() && overlaps_(row[4], row[5] && row[5] !== '-' ? row[5] : row[4], record.periode);
  });
  if (!valid) throw new Error('Arsip tidak cocok dengan pegawai atau rentang submisi yang dipilih.');
}
function documentType_(payload) {
  var type = payload.jenisDokumen || (payload.action === 'klaim_cuti' ? 'cuti' : 'spt');
  if (type !== 'spt' && type !== 'cuti') throw new Error('Jenis dokumen tidak valid.');
  return type;
}
function mimeForName_(name) {
  if (/\.pdf$/i.test(name)) return 'application/pdf';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.xlsx$/i.test(name)) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  throw new Error('Format file tidak didukung.');
}
function attachmentName_(source, type, record, origin) {
  var ext = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' }[source.getMimeType()];
  if (!ext) throw new Error('Dokumen pendukung harus PDF, JPG atau PNG.');
  var stem = source.getName().replace(/\.[^.]+$/, '').replace(/[\\/\r\n]/g, '_');
  return type.toUpperCase() + '_' + record.nama.replace(/\s+/g, '_') + '_' + stem + '_' + origin + '_' + Utilities.getUuid().slice(0, 8) + ext;
}
function attachSource_(source, type, record, folder, origin, requestId, pending) {
  var rows = registryRows_();
  var dates = sourceDates_(source.getId(), type, record, true);
  for (var i = 0; i < rows.length; i++) {
    if (sameScope_(rows[i], record) && rows[i].jenisDokumen === type && rows[i].sourceFileId === source.getId()) {
      var existing = liveAttachment_(rows[i]);
      if (existing) {
        writeDateColumns_(registry_(true), rows[i].row, 15, dates);
        return documentView_(rows[i], existing);
      }
      if (rows[i].status === 'deleted') pending = rows[i];
    }
  }
  var copy = source.makeCopy(attachmentName_(source, type, record, origin), folder);
  var values = [new Date(), record.modul, "'" + record.nip, record.nama, record.periode, folder.getId(), copy.getId(), copy.getName(), type, source.getId(), source.getUrl(), origin, 'active', requestId];
  try {
    var sheet = registry_(true);
    if (pending) sheet.getRange(pending.row, 1, 1, values.length).setValues([values]);
    else sheet.appendRow(values);
    writeDateColumns_(sheet, pending ? pending.row : sheet.getLastRow(), 15, dates);
  } catch (error) {
    // Only the just-created copy is rolled back. The canonical archive is untouched.
    copy.setTrashed(true);
    throw error;
  }
  invalidateProcessed_(record);
  return documentView_({ folderId: folder.getId(), jenisDokumen: type, sourceFileId: source.getId(), sourceUrl: source.getUrl(), origin: origin }, copy);
}
function claimAttachment_(payload) {
  var record = submissionRecord_(payload), folder = recordedFolder_(record), type = documentType_(payload);
  var sourceId = driveId_(payload.sourceUrl);
  if (!sourceId) throw new Error('Link arsip tidak valid.');
  var source = DriveApp.getFileById(sourceId);
  validArchiveSource_(source, type, record);
  return { status: 'success', document: attachSource_(source, type, record, folder, 'klaim', text_(payload.requestId) || Utilities.getUuid()), folderUrl: folder.getUrl() };
}
function uploadExtraAttachment_(payload) {
  var record = submissionRecord_(payload), folder = recordedFolder_(record), type = text_(payload.jenisDokumen);
  if (['lupa_absen','tugas_belajar','lainnya'].indexOf(type) < 0) throw new Error('Pilih jenis dokumen tambahan yang valid.');
  var requestId = text_(payload.requestId);
  if (!requestId || requestId.length > 100) throw new Error('ID permintaan upload diperlukan.');
  var previous = registryRows_().filter(function(entry) { return sameScope_(entry,record) && entry.requestId === requestId; })[0];
  if (previous) {
    var live = liveAttachment_(previous);
    if (!live || previous.jenisDokumen !== type) throw new Error('Permintaan ini telah digunakan. Pilih file kembali.');
    invalidateProcessed_(record);
    return {status:'success',document:documentView_(previous,live)};
  }
  var name = text_(payload.fileName), encoded = text_(payload.fileBase64);
  if (!/\.(pdf|png|jpe?g)$/i.test(name) || !encoded || encoded.length > 13981016 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('File harus PDF/JPG/PNG, maksimal 10 MB.');
  var bytes = Utilities.base64Decode(encoded);
  if (!bytes.length || bytes.length > 10485760) throw new Error('Ukuran file tidak valid.');
  var safeName = type + '_' + record.nip + '_' + Utilities.getUuid() + '.' + name.split('.').pop().toLowerCase();
  var file = folder.createFile(Utilities.newBlob(bytes,mimeForName_(name),safeName));
  try {
    registry_(true).appendRow([new Date(),record.modul,"'"+record.nip,record.nama,record.periode,folder.getId(),file.getId(),safeName,type,'','','upload_lain','active',requestId]);
  } catch(error) { file.setTrashed(true); throw error; }
  invalidateProcessed_(record);
  var entry = {folderId:folder.getId(),jenisDokumen:type,sourceFileId:'',sourceUrl:'',origin:'upload_lain'};
  return {status:'success',document:documentView_(entry,file)};
}
function uploadAttachment_(payload) {
  var record = submissionRecord_(payload), folder = recordedFolder_(record), type = documentType_(payload);
  var requestId = text_(payload.requestId);
  if (!requestId) throw new Error('ID permintaan upload diperlukan.');
  var rows = registryRows_(), pending = null;
  for (var i = 0; i < rows.length; i++) {
    if (sameScope_(rows[i], record) && rows[i].requestId === requestId) {
      var existing = liveAttachment_(rows[i]);
      if (existing) return { status: 'success', document: documentView_(rows[i], existing), folderUrl: folder.getUrl() };
      if (rows[i].status === 'archived') pending = rows[i];
      else throw new Error('Upload ini sudah pernah diproses. Gunakan klaim arsip untuk melampirkan ulang.');
      break;
    }
  }
  var source;
  if (pending) source = DriveApp.getFileById(pending.sourceFileId);
  else {
    if (!Array.isArray(payload.sptData) || !payload.sptData.some(function(item) {
      return nip_(item.nip) === record.nip && overlaps_(item.tanggalBerangkat, item.tanggalPulang, record.periode);
    })) throw new Error('Dokumen harus memuat pegawai dari tab 2 dan tanggal dalam rentang submisi.');
    var result = saveArchive_(Object.assign({}, payload, { modul: type }));
    if (result.status !== 'success') throw new Error(result.message || 'Arsip belum berhasil direkap.');
    source = DriveApp.getFileById(result.fileId);
    var sheet = registry_(true);
    sheet.appendRow([new Date(), record.modul, "'" + record.nip, record.nama, record.periode, folder.getId(), '', '', type, source.getId(), source.getUrl(), 'upload', 'archived', requestId]);
    pending = { row: sheet.getLastRow() };
  }
  return { status: 'success', document: attachSource_(source, type, record, folder, 'upload', requestId, pending), folderUrl: folder.getUrl() };
}
function deleteAttachment_(payload) {
  var record = submissionRecord_(payload), folder = recordedFolder_(record), fileId = text_(payload.fileId);
  if (!fileId) throw new Error('File ID salinan wajib diisi; penghapusan berdasarkan nama tidak diizinkan.');
  var entry = registryRows_().filter(function(row) { return row.fileId === fileId && sameScope_(row, record); })[0];
  if (!entry || entry.fileId === entry.sourceFileId || fileId === record.presensiId || fileId === record.spreadsheetId) throw new Error('File bukan salinan pendukung untuk pengumpulan ini.');
  if (entry.status === 'deleted') return { status: 'success', fileId: fileId };
  var file = DriveApp.getFileById(fileId);
  if (!hasOnlyParent_(file, folder.getId())) throw new Error('File tidak berada di folder pengumpulan yang dipilih.');
  if (fileUnder_(file, SPT_FOLDER_ID) || fileUnder_(file, CUTI_FOLDER_ID)) throw new Error('Dokumen arsip tidak boleh dihapus melalui pengumpulan.');
  if (!file.isTrashed()) file.setTrashed(true);
  registry_(false).getRange(entry.row, 13).setValue('deleted');
  invalidateProcessed_(record);
  return { status: 'success', fileId: fileId, message: 'Salinan pengumpulan dipindahkan ke Trash. Arsip dan rekap tetap tersedia.' };
}
function retirePreviousPresensi_(previous, folder, newFileId, newSpreadsheetId) {
  if (!previous) return;
  var protectedIds = registryRows_().map(function(row) { return row.fileId; });
  [previous.presensiId, previous.spreadsheetId].forEach(function(id) {
    if (!id || id === newFileId || id === newSpreadsheetId || protectedIds.indexOf(id) !== -1) return;
    try {
      var file = DriveApp.getFileById(id);
      if (hasOnlyParent_(file, folder.getId()) && !fileUnder_(file, SPT_FOLDER_ID) && !fileUnder_(file, CUTI_FOLDER_ID)) file.setTrashed(true);
    } catch (error) { Logger.log('File presensi sebelumnya dipertahankan: ' + error.message); }
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var payload = JSON.parse(e.postData.contents);
    lock.waitLock(30000);
    if (payload.action === 'proses_bukti') {
      var trace = text_(payload.requestId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
      var started = Date.now();
      Logger.log(JSON.stringify({ event: 'proses_bukti_start', requestId: trace }));
      var processedResult = processEvidence_(payload);
      Logger.log(JSON.stringify({ event: 'proses_bukti_success', requestId: trace, elapsedMs: Date.now() - started }));
      return json_(processedResult);
    }
    if (payload.action === 'preview_rekap_final') return json_(previewFinal_(payload));
    if (payload.action === 'simpan_rekap_final') return json_(saveFinal_(payload));
    if (payload.action === 'list_pendukung') return json_(listAttachments_(payload));
    if (payload.action === 'rekap_bulanan') return json_(monthlyRecap_(payload));
    if (['klaim_dokumen', 'klaim_spt', 'klaim_cuti'].indexOf(payload.action) !== -1) return json_(claimAttachment_(payload));
    if (payload.action === 'upload_pendukung') return json_(uploadAttachment_(payload));
    if (payload.action === 'upload_pendukung_lain') return json_(uploadExtraAttachment_(payload));
    if (['hapus_pendukung', 'hapus_klaim_spt', 'hapus_klaim_cuti'].indexOf(payload.action) !== -1) return json_(deleteAttachment_(payload));
    if (payload.action && payload.action !== 'check_status') throw new Error('Action tidak dikenal.');
    if (['spt', 'cuti', 'uang-makan', 'tukin'].indexOf(payload.modul) === -1) throw new Error('Modul tidak dikenal.');
    if (payload.action !== 'check_status') {
      if (payload.modul === 'uang-makan' || payload.modul === 'tukin') validateTab2Data_(payload);
      else if (!payload.fileBase64 || !payload.fileName) throw new Error('Berkas upload diperlukan.');
    }
    return legacyDoPost_(e);
  } catch (error) {
    if (payload && payload.action === 'proses_bukti') Logger.log(JSON.stringify({ event: 'proses_bukti_error', requestId: trace || '' }));
    return json_({ status: 'error', message: error.message });
  }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}

// Tab 4: preview from saved tab-2 data; only the final confirmation writes V6:V.
var BASELINE_SHEET = '_PRESENSI_TAB2';
// Same holiday configuration currently used by the frontend. Extend through HARI_LIBUR.
var CUTI_HOLIDAYS = ['2026-01-01','2026-01-16','2026-02-17','2026-03-19','2026-03-21','2026-03-22','2026-04-03','2026-04-05','2026-05-01','2026-05-14','2026-05-27','2026-05-31','2026-06-01','2026-06-16','2026-08-17','2026-08-25','2026-12-25'];
function holidayDates_() {
  var dates = CUTI_HOLIDAYS.slice();
  var sheet = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID).getSheetByName('HARI_LIBUR');
  if (sheet) {
    var rows = sheet.getDataRange().getValues();
    if (text_(rows[0] && rows[0][0]).toLowerCase() !== 'tanggal') throw new Error('Kolom A sheet HARI_LIBUR harus berjudul Tanggal.');
    rows.slice(1).forEach(function(row) { if (text_(row[0])) dates.push(isoDate_(row[0])); });
  }
  return dates;
}
function archiveDateList_(start, end, type) {
  var dates = dateRange_(start, end);
  if (type !== 'cuti') return dates;
  var holidays = holidayDates_();
  return dates.filter(function(date) {
    var day = parseDate_(date).getUTCDay();
    return day !== 0 && day !== 6 && holidays.indexOf(date) === -1;
  });
}
function cutiCountWarning_(dates, count) {
  var expected = Number(count);
  return !text_(count) || !isFinite(expected) || expected !== dates.length
    ? 'Jumlah Hari Cuti (' + text_(count) + ') berbeda dari tanggal kerja hasil hitung (' + dates.length + '). Periksa rentang, jumlah hari, dan kalender libur.' : '';
}
function isoDate_(value) {
  var date = parseDate_(value);
  if (!date) throw new Error('Tanggal tidak valid: ' + text_(value));
  return date.toISOString().slice(0, 10);
}
function dateRange_(startValue, endValue) {
  var start = parseDate_(startValue), end = parseDate_(endValue && endValue !== '-' ? endValue : startValue);
  if (!start || !end || end < start || (end - start) / 86400000 > 730) throw new Error('Rentang tanggal dokumen tidak valid atau melebihi 731 hari.');
  var result = [];
  for (var time = start.getTime(); time <= end.getTime(); time += 86400000) result.push(new Date(time).toISOString().slice(0, 10));
  return result;
}
function writeDateColumns_(sheet, row, firstColumn, dates) {
  var width = Math.max(dates.length, sheet.getLastColumn() - firstColumn + 1);
  if (!width) return;
  var end = firstColumn + width - 1;
  if (end > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), end - sheet.getMaxColumns());
  var headers = sheet.getRange(1, firstColumn, 1, width).getValues()[0];
  headers.forEach(function(header, i) {
    if (header && header !== 'Tanggal_' + (i + 1)) throw new Error('Kolom tanggal berbenturan dengan kolom lain pada ' + sheet.getName() + '.');
  });
  sheet.getRange(1, firstColumn, 1, width).setValues([headers.map(function(_, i) { return 'Tanggal_' + (i + 1); })]);
  var values = [];
  // Integer Sheets serials represent civil dates: no time component or timezone shift.
  for (var i = 0; i < width; i++) values.push(i < dates.length ? Math.round((parseDate_(dates[i]).getTime() - Date.UTC(1899, 11, 30)) / 86400000) : '');
  sheet.getRange(row, firstColumn, 1, width).setValues([values]).setNumberFormat('yyyy-mm-dd');
}
function sourceDates_(sourceId, type, record, writeArchive) {
  var book = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  var sheet = book.getSheetByName(type === 'spt' ? 'REKAP_SPT' : 'REKAP_CUTI');
  if (!sheet && type === 'spt') sheet = book.getSheetByName('REKAP _SPT');
  var values = sheet ? sheet.getDataRange().getValues() : [], dates = {};
  var range = dateRangeFromPeriod_(record.periode);
  values.slice(1).forEach(function(row, index) {
    if (nip_(row[1]) !== record.nip || driveId_(row[9]) !== sourceId) return;
    var allDates = archiveDateList_(row[4], row[5], type);
    if (type === 'cuti') {
      var warning = cutiCountWarning_(allDates, row[6]);
      if (warning) throw new Error(warning);
    }
    if (writeArchive) writeDateColumns_(sheet, index + 2, 11, allDates);
    allDates.forEach(function(date) { if (date >= range[0] && date <= range[1]) dates[date] = true; });
  });
  var result = Object.keys(dates).sort();
  if (!result.length) throw new Error('Tanggal arsip tidak ditemukan untuk pegawai/periode ini. Klaim ulang dokumen yang benar.');
  return result;
}
function dateRangeFromPeriod_(period) {
  var parts = text_(period).split(/\s*s\/d\s*/i);
  if (parts.length !== 2) throw new Error('Rentang submisi tidak valid.');
  var start = isoDate_(parts[0]), end = isoDate_(parts[1]);
  if (start > end) throw new Error('Rentang submisi terbalik.');
  return [start, end];
}
function saveTab2Baseline_(book, workingSheet, data) {
  if (!Array.isArray(data) || !data.length) throw new Error('Data presensi tab 2 kosong.');
  var sheet = book.getSheetByName(BASELINE_SHEET) || book.insertSheet(BASELINE_SHEET);
  // This is an internal snapshot, never read from the mutable final Keterangan column.
  sheet.getRange(1, 1).setValue('Snapshot tab 2 — jangan diedit');
  sheet.getRange(2, 1).setValue(workingSheet.getSheetId());
  sheet.getRange(3, 1).setValue(data.length);
  sheet.getRange(6, 1, data.length, 22).setValues(data);
  sheet.hideSheet();
}
function savedPresensi_(record) {
  var book = SpreadsheetApp.openById(record.spreadsheetId), baseline = book.getSheetByName(BASELINE_SHEET);
  var working = baseline ? book.getSheets().filter(function(s) { return String(s.getSheetId()) === String(baseline.getRange(2, 1).getValue()); })[0] : book.getSheets()[0];
  if (!working) throw new Error('Sheet rekap tab 2 tidak ditemukan.');
  var original = baseline || working;
  var data = original.getRange(6, 1, Math.max(1, original.getLastRow() - 5), 22).getDisplayValues();
  var rows = [], seen = {}, period = dateRangeFromPeriod_(record.periode);
  for (var i = 0; i < data.length; i++) {
    if (text_(data[i][0]).toUpperCase() === 'TOTAL') break;
    if (!data[i].some(function(v) { return text_(v); })) break;
    var date = isoDate_(data[i][2]);
    if (seen[date] || date < period[0] || date > period[1]) throw new Error('Tanggal presensi duplikat/di luar submisi. Simpan ulang tab 2.');
    seen[date] = true;
    rows.push({ tanggal: date, hari: text_(data[i][1]), datang: text_(data[i][3]), pulang: text_(data[i][4]), keteranganAwal: text_(data[i][21]) || '-' });
  }
  if (!rows.length) throw new Error('Rekap tab 2 belum berisi data presensi.');
  var current = working.getRange(6, 1, rows.length, 22).getDisplayValues();
  var corrections = baseline ? JSON.parse(text_(baseline.getRange(5,2).getValue()) || '{}') : {};
  rows.forEach(function(row, i) {
    var changes = corrections[row.tanggal] || {};
    var validTime = function(punch,column) { var value=text_(current[i][column]); return value===row[punch] || (attendanceMinutes_(row[punch])===null && changes[punch] && value===changes[punch].time); };
    if (isoDate_(current[i][2]) !== row.tanggal || !validTime('datang',3) || !validTime('pulang',4)) throw new Error('Tanggal/jam rekap telah berubah. Simpan ulang tab 2 sebelum melanjutkan.');
  });
  return { book: book, working: working, baseline: baseline, rows: rows, current: current };
}
function digest_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value)).map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function finalState_(payload) {
  var record = submissionRecord_(payload); recordedFolder_(record);
  var saved = savedPresensi_(record), period = dateRangeFromPeriod_(record.periode), documents = [];
  registryRows_().forEach(function(entry) {
    if (!sameScope_(entry, record) || entry.status !== 'active') return;
    if (['spt','cuti','lupa_absen','tugas_belajar','lainnya'].indexOf(entry.jenisDokumen) < 0) throw new Error('Jenis bukti tidak dikenal.');
    if (!liveAttachment_(entry)) throw new Error('Salinan bukti tidak lagi tersedia di folder pengumpulan. Hapus klaim yang tidak tersedia atau klaim ulang sebelum melanjutkan.');
    // Recompute from original archive dates: old generated columns may be shifted by a day.
    var dates = ['spt','cuti'].indexOf(entry.jenisDokumen) >= 0 ? sourceDates_(entry.sourceFileId, entry.jenisDokumen, record, false) : [];
    if (entry.jenisDokumen === 'cuti') dates = dates.filter(function(date) {
      return !saved.rows.some(function(row) { return row.tanggal === date && row.keteranganAwal.toLowerCase() === 'libur'; });
    });
    dates = dates.filter(function(date) { return date >= period[0] && date <= period[1]; });
    documents.push({ fileId: entry.fileId, sourceFileId: entry.sourceFileId, jenisDokumen: entry.jenisDokumen, fileName: entry.fileName, dates: dates });
  });
  documents.sort(function(a,b) { return a.fileId.localeCompare(b.fileId); });
  var rows = saved.rows.map(function(row) {
    var day = parseDate_(row.tanggal).getUTCDay();
    var holiday = day === 0 || day === 6 || row.keteranganAwal.toLowerCase() === 'libur' || /^(sabtu|minggu)$/i.test(row.hari);
    var matched = documents.filter(function(doc) { return doc.dates.indexOf(row.tanggal) !== -1; });
    var spt = matched.some(function(doc) { return doc.jenisDokumen === 'spt'; });
    var cuti = matched.some(function(doc) { return doc.jenisDokumen === 'cuti'; });
    return Object.assign({}, row, { libur: holiday, konflik: spt && cuti,
      keterangan: holiday ? 'Libur' : spt && cuti ? '' : spt ? 'Dinas' : cuti ? 'Cuti' : row.keteranganAwal,
      dokumen: matched.map(function(doc) { return { fileId: doc.fileId, fileName: doc.fileName, jenisDokumen: doc.jenisDokumen }; }) });
  });
  var schedules = savedSchedules_(saved, rows);
  var revision = digest_({ record: record, rows: rows, documents: documents, current: saved.current, schedules: schedules,
    adjustments: saved.baseline ? text_(saved.baseline.getRange(5,2).getValue()) : '' });
  return { record: record, saved: saved, rows: rows, revision: revision, documents: documents };
}
function previewFinal_(payload) {
  var state = finalState_(payload);
  if (!processedState_(state)) throw new Error('Klaim belum diproses atau sudah berubah. Klik Lanjut Proses pada tab 3.');
  return previewFromState_(state);
}
function previewFromState_(state) {
  var decisions = JSON.parse(text_(state.saved.baseline.getRange(2, 2).getValue()) || '{}');
  var schedules = savedSchedules_(state.saved, state.rows);
  var adjustments = savedAdjustments_(state);
  var previewRows = state.rows.map(function(row, i) { return Object.assign({}, row, {
    keterangan: text_(state.saved.current[i][21]) || '-',
    jamKerja: schedules[row.tanggal],
    penyelesaian: row.konflik && !row.libur ? decisions[row.tanggal] || '' : ''
  }); });
  return { status: 'success', spreadsheetId: state.record.spreadsheetId, revision: state.revision,
    nama: state.record.nama, nip: state.record.nip, periode: state.record.periode,
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + state.record.spreadsheetId + '/edit', rows: previewRows,
    adjustments: adjustments, adjustmentDocuments: state.documents.filter(function(doc) { return doc.jenisDokumen === 'lupa_absen'; }) };
}
function saveFinal_(payload) {
  if (payload.confirmed !== true) throw new Error('Konfirmasi pemeriksaan preview diperlukan.');
  var state = finalState_(payload);
  if (!processedState_(state)) throw new Error('Klik Lanjut Proses pada tab 3 setelah perubahan klaim.');
  if (payload.revision !== state.revision) throw new Error('Data presensi atau klaim berubah. Muat ulang preview dan periksa kembali.');
  var decisions = payload.resolutions || {};
  Object.keys(decisions).forEach(function(date) {
    if (!state.rows.some(function(row) { return row.tanggal === date && row.konflik && !row.libur; })) throw new Error('Penyesuaian hanya diizinkan pada tanggal konflik.');
  });
  var result = state.rows.map(function(row) {
    if (!row.konflik || row.libur) return row;
    var choice = decisions[row.tanggal];
    if (choice !== 'Dinas' && choice !== 'Cuti') throw new Error('Selesaikan konflik tanggal ' + row.tanggal + '.');
    return Object.assign({}, row, { keterangan: choice });
  });
  var schedules = validateSchedules_(payload.schedules || savedSchedules_(state.saved, result), result);
  result = result.map(function(row) { return Object.assign({}, row, { jamKerja: schedules[row.tanggal] }); });
  var corrections = validateAdjustments_(state, result, payload.adjustments || {});
  result = applyAdjustments_(result, corrections);
  // Financial inputs are read on the server, never accepted from a browser payload.
  var calculation = calculateAttendance_(result, payrollEmployee_(state.record), state.record.modul);
  // A partially failed final save must not leave an old nominal marked current.
  invalidateCalculation_(state.record);
  // Legacy recap: capture the original before the first final write, never on preview.
  if (!state.saved.baseline) saveTab2Baseline_(state.saved.book, state.saved.working, state.saved.current);
  var values = result.map(function(row) { return [row.keterangan]; });
  var colors = result.map(function(row) {
    var color = row.keterangan === 'Libur' ? '#f4cccc' : row.keterangan === 'Dinas' ? '#c9efbc' : row.keterangan === 'Cuti' ? '#affdfd' : '#ffffff';
    return Array(22).fill(color);
  });
  // Preserve spreadsheet ID, times, unrelated columns/formulas, borders and conditional rules.
  state.saved.working.getRange(6, 22, result.length, 1).setValues(values);
  state.saved.working.getRange(6, 4, result.length, 2).setNumberFormat('@').setValues(result.map(function(row) { return [row.datang, row.pulang]; }));
  writeAttendanceFlags_(state.saved.working, result);
  state.saved.working.getRange(6, 1, result.length, 22).setBackgrounds(colors);
  state.saved.baseline = state.saved.book.getSheetByName(BASELINE_SHEET);
  state.saved.baseline.getRange(3, 2).setValue(JSON.stringify(schedules));
  state.saved.baseline.getRange(5, 2).setValue(JSON.stringify(corrections));
  var note = saveCalculationNote_(state, calculation);
  saveDailyRecap_(state, calculation);
  saveAdjustments_(state, corrections);
  writeCalculationMaster_(state.record, calculation, note);
  SpreadsheetApp.flush();
  var revision = markProcessed_(payload, decisions, state);
  return { status: 'success', spreadsheetId: state.record.spreadsheetId, revision: revision,
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + state.record.spreadsheetId + '/edit', rows: result,
    nama: state.record.nama, nip: state.record.nip, periode: state.record.periode,
    calculation: calculation, note: note, adjustments: corrections,
    adjustmentDocuments: state.documents.filter(function(doc) { return doc.jenisDokumen === 'lupa_absen'; }),
    message: 'Rekap dan hasil perhitungan telah disimpan.' };
}

function validateTab2Data_(payload) {
  var data = payload.sheetData, period = dateRangeFromPeriod_(payload.periode), seen = {};
  if (!Array.isArray(data) || !data.length || data.length > 366) throw new Error('Data bacaan tab 2 diperlukan (maksimal 366 baris).');
  data.forEach(function(row) {
    if (!Array.isArray(row) || row.length !== 22) throw new Error('Format rekap tab 2 harus 22 kolom.');
    var date = isoDate_(row[2]);
    if (seen[date] || date < period[0] || date > period[1]) throw new Error('Tanggal tab 2 duplikat atau di luar periode.');
    seen[date] = true;
  });
}
function invalidateProcessed_(record) {
  var sheet = SpreadsheetApp.openById(record.spreadsheetId).getSheetByName(BASELINE_SHEET);
  if (sheet) { sheet.getRange(1, 2).setValue(''); sheet.getRange(2, 2).setValue(''); }
  invalidateCalculation_(record);
}
function processedState_(state) {
  return !!state.saved.baseline && text_(state.saved.baseline.getRange(1, 2).getValue()) === state.revision;
}
function markProcessed_(payload, decisions, validatedState) {
  // doPost holds the script lock. Reuse its validated archive/Drive snapshot instead
  // of scanning all archives again; read back only the recap values just written.
  var fresh = validatedState || finalState_(payload);
  if (validatedState) {
    fresh.saved.current = fresh.saved.working.getRange(6, 1, fresh.rows.length, 22).getDisplayValues();
    fresh.saved.baseline = fresh.saved.book.getSheetByName(BASELINE_SHEET);
    fresh.revision = digest_({ record: fresh.record, rows: fresh.rows, documents: fresh.documents, current: fresh.saved.current, schedules: savedSchedules_(fresh.saved, fresh.rows), adjustments: text_(fresh.saved.baseline.getRange(5,2).getValue()) });
  }
  fresh.saved.baseline.getRange(2, 2).setValue(JSON.stringify(decisions || {}));
  fresh.saved.baseline.getRange(1, 2).setValue(fresh.revision);
  return fresh.revision;
}
function processEvidence_(payload) {
  var state = finalState_(payload);
  // Re-entering an unchanged submission preserves the previous conflict decisions.
  if (processedState_(state)) return previewFromState_(state);
  invalidateCalculation_(state.record);
  if (!state.saved.baseline) saveTab2Baseline_(state.saved.book, state.saved.working, state.saved.current);
  var rows = state.rows.map(function(row) {
    return Object.assign({}, row, { keterangan: row.konflik && !row.libur ? row.keteranganAwal : row.keterangan });
  });
  state.saved.working.getRange(6, 22, rows.length, 1).setValues(rows.map(function(row) { return [row.keterangan]; }));
  state.saved.working.getRange(6, 4, rows.length, 2).setValues(rows.map(function(row) { return [row.datang, row.pulang]; }));
  writeAttendanceFlags_(state.saved.working, rows);
  state.saved.working.getRange(6, 1, rows.length, 22).setBackgrounds(rows.map(function(row) {
    var color = row.libur ? '#f4cccc' : row.konflik ? '#fff2cc' : row.keterangan === 'Dinas' ? '#c9efbc' : row.keterangan === 'Cuti' ? '#affdfd' : '#ffffff';
    return Array(22).fill(color);
  }));
  SpreadsheetApp.flush();
  markProcessed_(payload, {}, state);
  return previewFromState_(state);
}

// Attendance/payroll rules confirmed by the submission owner, 20 September 2026.
// Percentages below are percentage points (0.5 means 0.5%, not 50%).
function attendanceStatus_(row) {
  var day = parseDate_(row.tanggal).getUTCDay(), status = text_(row.keterangan).toUpperCase();
  if (row.libur || day === 0 || day === 6 || status === 'LIBUR') return 'Libur';
  if (status === 'DINAS' || status === 'SPT') return 'Dinas';
  if (/^CUTI(?:\s|$)/.test(status)) return 'Cuti';
  if (status === 'TB' || status === 'TUGAS BELAJAR') return 'TB';
  return status;
}
function writeAttendanceFlags_(sheet, rows) {
  var flags = rows.map(function(row) {
    var status = attendanceStatus_(row);
    return [['WFO','WFA','WFH'].indexOf(status) !== -1, status === 'Dinas', status === 'TB', status === 'Cuti', status === 'Libur', status !== 'Libur'];
  });
  // Batch the adjacent M:P columns; never touch G:J/L/Q:U template formulas.
  [{ column: 6, start: 0, width: 1 }, { column: 11, start: 1, width: 1 }, { column: 13, start: 2, width: 4 }].forEach(function(group) {
    sheet.getRange(6, group.column, rows.length, group.width).setValues(flags.map(function(row) { return row.slice(group.start, group.start + group.width).map(function(v) { return v ? 'v' : ''; }); }));
    var totals = [];
    for (var i = group.start; i < group.start + group.width; i++) totals.push(flags.filter(function(row) { return row[i]; }).length);
    sheet.getRange(6 + rows.length, group.column, 1, group.width).setValues([totals]);
  });
}
function validateSchedules_(input, rows) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Pilihan jam kerja tidak valid.');
  Object.keys(input).forEach(function(date) {
    if (!rows.some(function(row) { return row.tanggal === date; })) throw new Error('Tanggal jam kerja di luar preview.');
    if (input[date] !== 'biasa' && input[date] !== 'ramadan') throw new Error('Pilihan jam kerja tidak dikenal.');
  });
  var result = {};
  rows.forEach(function(row) { result[row.tanggal] = input[row.tanggal] || 'biasa'; });
  return result;
}
function savedSchedules_(saved, rows) {
  var input = saved.baseline ? JSON.parse(text_(saved.baseline.getRange(3, 2).getValue()) || '{}') : {};
  return validateSchedules_(input, rows);
}
function attendanceMinutes_(value) {
  var text = text_(value);
  if (!text || text === '-') return null;
  var match = /^(\d{1,2})[:.](\d{2})(?::(\d{2}))?$/.exec(text);
  if (!match || +match[1] > 23 || +match[2] > 59 || +(match[3] || 0) > 59) throw new Error('Jam presensi tidak valid: ' + text + '. Periksa tab 2.');
  return +match[1] * 60 + +match[2]; // Attendance is classified at minute precision.
}
function attendanceClock_(minutes) {
  return ('0' + Math.floor(minutes / 60)).slice(-2) + ':' + ('0' + minutes % 60).slice(-2);
}
var ADJUSTMENT_HEADERS = ['Modul','NIP','Periode','SpreadsheetId','Tanggal','Presensi','JamKoreksi','FileId','Status','Diperbarui'];
function adjustmentSheet_(create) {
  var book = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID), sheet = book.getSheetByName('ADJUSTMENT_PRESENSI');
  if (!sheet && create) { sheet = book.insertSheet('ADJUSTMENT_PRESENSI'); sheet.appendRow(ADJUSTMENT_HEADERS); sheet.setFrozenRows(1); }
  if (sheet && JSON.stringify(sheet.getRange(1,1,1,ADJUSTMENT_HEADERS.length).getValues()[0]) !== JSON.stringify(ADJUSTMENT_HEADERS)) throw new Error('Header ADJUSTMENT_PRESENSI tidak sesuai.');
  return sheet;
}
function savedAdjustments_(state) {
  var saved = JSON.parse(text_(state.saved.baseline.getRange(5,2).getValue()) || '{}'), allowed = {};
  Object.keys(saved).forEach(function(date) {
    Object.keys(saved[date]).forEach(function(punch) {
      var correction = saved[date][punch];
      if (state.documents.some(function(doc) { return doc.jenisDokumen === 'lupa_absen' && doc.fileId === correction.fileId; })) {
        if (!allowed[date]) allowed[date] = {};
        allowed[date][punch] = correction;
      }
    });
  });
  return allowed;
}
function validateAdjustments_(state, rows, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Format adjustment tidak valid.');
  var accepted = {}, proposed = {}, record = state.record;
  Object.keys(input).forEach(function(date) {
    var row = rows.filter(function(r) { return r.tanggal === date; })[0];
    if (!row || ['WFO','WFA','WFH'].indexOf(attendanceStatus_(row)) < 0) throw new Error('Adjustment hanya untuk hari WFO/WFA/WFH dalam periode.');
    if (!input[date] || typeof input[date] !== 'object' || Array.isArray(input[date])) throw new Error('Format koreksi tanggal tidak valid.');
    Object.keys(input[date]).forEach(function(punch) {
      var item = input[date][punch];
      if (['datang','pulang'].indexOf(punch) < 0 || attendanceMinutes_(row[punch]) !== null) throw new Error('Hanya presensi kosong yang dapat dikoreksi.');
      if (!item || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time || '')) throw new Error('Isi jam koreksi HH:mm pada ' + date + '.');
      if (!state.documents.some(function(doc) { return doc.jenisDokumen === 'lupa_absen' && doc.fileId === item.fileId; })) throw new Error('Pilih surat lupa absen aktif milik submisi ini.');
      if (!accepted[date]) accepted[date] = {};
      accepted[date][punch] = {time:item.time,fileId:item.fileId};
      proposed[date+'|'+punch] = item.time;
    });
    if (Object.keys(accepted[date] || {}).length > 1 && attendanceMinutes_(row.datang) === null && attendanceMinutes_(row.pulang) === null) throw new Error('Kedua presensi kosong: hanya salah satu dapat di-adjustment pada ' + date + '.');
  });
  // Same NIP/date/punch is one event across both modules and overlapping periods.
  var sheet = adjustmentSheet_(false), ledger = sheet ? sheet.getDataRange().getValues().slice(1) : [], registry = registryRows_();
  var currentRecords = {}, book = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  ['uang-makan','tukin'].forEach(function(module) {
    var master = book.getSheetByName(eventSheetName_(module));
    if (master) master.getDataRange().getValues().slice(1).forEach(function(row) { if(nip_(row[1]) === record.nip) currentRecords[module+'|'+text_(row[3])] = driveId_(row[9]); });
  });
  var liveFiles = {};
  registry.filter(function(doc) { return doc.nip===record.nip && doc.jenisDokumen==='lupa_absen'; }).forEach(function(doc) { if(liveAttachment_(doc)) liveFiles[doc.fileId]=true; });
  var union = {};
  ledger.forEach(function(entry) {
    if (nip_(entry[1]) !== record.nip || entry[8] !== 'active' || (entry[0] === record.modul && entry[2] === record.periode)) return;
    if (!liveFiles[entry[7]] || currentRecords[entry[0]+'|'+text_(entry[2])] !== entry[3]) return;
    var key = isoDate_(entry[4])+'|'+entry[5], time = text_(entry[6]);
    if (union[key] && union[key] !== time) throw new Error('Jam adjustment lintas modul berbeda. Samakan koreksi sebelum melanjutkan.');
    union[key] = time;
  });
  Object.keys(proposed).forEach(function(key) {
    if (union[key] && union[key] !== proposed[key]) throw new Error('Jam koreksi untuk kejadian ini berbeda dari modul/periode lain: ' + key + '.');
    union[key] = proposed[key];
  });
  var months = {};
  Object.keys(union).forEach(function(key) { var month=key.slice(0,7); months[month]=(months[month]||0)+1; });
  Object.keys(proposed).forEach(function(key) {
    if (months[key.slice(0,7)] > 4) throw new Error('Kuota 4 kejadian adjustment bulan ' + key.slice(0,7) + ' terlampaui (termasuk modul/periode lain).');
    var date=key.slice(0,10), row=rows.filter(function(r) { return r.tanggal===date; })[0];
    if (attendanceMinutes_(row.datang)===null && attendanceMinutes_(row.pulang)===null && union[date+'|datang'] && union[date+'|pulang']) throw new Error('Kedua presensi kosong: hanya satu koreksi diizinkan, termasuk lintas modul.');
  });
  if (Object.keys(proposed).length > (record.modul === 'tukin' ? 8 : 4)) throw new Error('Kuota adjustment periode terlampaui.');
  return accepted;
}
function applyAdjustments_(rows, corrections) {
  return rows.map(function(row) {
    var result = Object.assign({},row), changes = corrections[row.tanggal] || {};
    result.originalDatang = row.datang; result.originalPulang = row.pulang;
    result.adjusted = Object.keys(changes).length;
    result.adjustments = changes;
    Object.keys(changes).forEach(function(punch) { result[punch] = changes[punch].time; });
    return result;
  });
}
function saveAdjustments_(state, corrections) {
  var sheet=adjustmentSheet_(true), rows=sheet.getDataRange().getValues(), record=state.record, found={}, stamp=new Date().toISOString();
  rows.slice(1).forEach(function(row,i) {
    if(row[0]!==record.modul || nip_(row[1])!==record.nip || row[2]!==record.periode) return;
    var date=isoDate_(row[4]), punch=row[5], correction=corrections[date] && corrections[date][punch];
    if(correction && !found[date+'|'+punch]) {
      found[date+'|'+punch]=true;
      sheet.getRange(i+2,7).setNumberFormat('@');
      sheet.getRange(i+2,1,1,10).setValues([[record.modul,"'"+record.nip,record.periode,record.spreadsheetId,date,punch,correction.time,correction.fileId,'active',stamp]]);
    } else sheet.getRange(i+2,9,1,2).setValues([['inactive',stamp]]);
  });
  Object.keys(corrections).forEach(function(date) { Object.keys(corrections[date]).forEach(function(punch) {
    if(found[date+'|'+punch])return; var c=corrections[date][punch];
    sheet.getRange(sheet.getLastRow()+1,7).setNumberFormat('@');
    sheet.appendRow([record.modul,"'"+record.nip,record.periode,record.spreadsheetId,date,punch,c.time,c.fileId,'active',stamp]);
  }); });
}
function calculateAttendance_(rows, employee, module) {
  var totals = { hariKerja: 0, masuk: 0, dinas: 0, cuti: 0, tb: 0, libur: 0, flexi: 0, terlambat: 0, psw: 0,
    tidakMasuk: 0, menitTelat: 0, menitPsw: 0, menitTanpaPresensi: 0, totalMenit: 0, potonganAbsensi: 0,
    lupaAbsen: 0, adjusted: 0, unadjusted: 0, adjustmentMonths: {} };
  var warnings = [], days = rows.map(function(row) {
    var status = attendanceStatus_(row), ramadan = row.jamKerja === 'ramadan';
    var start = ramadan ? 480 : 450, friday = parseDate_(row.tanggal).getUTCDay() === 5;
    var end = (ramadan ? 900 : 960) + (friday ? 30 : 0);
    var result = { tanggal: row.tanggal, status: status, jamKerja: ramadan ? 'ramadan' : 'biasa', datang: row.datang, pulang: row.pulang,
      wajibPulang: attendanceClock_(end), flexiMenit: 0, tl: 0, psw: 0, menitTelat: 0, menitPsw: 0, menitTanpaPresensi: 0, potongan: 0 };
    if (status === 'Libur') { totals.libur++; return result; }
    totals.hariKerja++;
    if (status === 'Dinas') { totals.dinas++; return result; }
    if (status === 'Cuti') { totals.cuti++; return result; }
    if (status === 'TB') { totals.tb++; return result; }
    if (['WFO','WFA','WFH'].indexOf(status) === -1) {
      warnings.push(row.tanggal + ': keterangan ' + (status || '-') + ' belum mempunyai aturan perhitungan.'); return result;
    }
    var arrival = attendanceMinutes_(row.datang), departure = attendanceMinutes_(row.pulang);
    result.adjusted = row.adjusted || 0;
    result.adjustments = row.adjustments || {};
    result.lupaAbsen = (attendanceMinutes_(row.originalDatang === undefined ? row.datang : row.originalDatang) === null ? 1 : 0) + (attendanceMinutes_(row.originalPulang === undefined ? row.pulang : row.originalPulang) === null ? 1 : 0);
    totals.lupaAbsen += result.lupaAbsen; totals.adjusted += result.adjusted; totals.unadjusted += result.lupaAbsen - result.adjusted;
    var month = row.tanggal.slice(0,7); totals.adjustmentMonths[month] = (totals.adjustmentMonths[month] || 0) + result.adjusted;
    if (arrival !== null && departure !== null && departure < arrival) throw new Error('Jam pulang mendahului datang pada ' + row.tanggal + '. Periksa tab 2.');
    var delay = arrival === null ? 0 : Math.max(0, arrival - start);
    result.flexiMenit = Math.min(60, delay);
    result.wajibPulang = attendanceClock_(end + result.flexiMenit);
    if (delay > 0 && delay <= 60) totals.flexi++;
    if (arrival === null && departure === null) totals.tidakMasuk++;
    else totals.masuk++; // One recorded punch establishes attendance; two missing punches do not.
    result.tl = arrival === null ? 3 : delay > 120 ? 3 : delay > 90 ? 2 : delay > 60 ? 1 : 0;
    result.menitTelat = arrival === null ? 0 : Math.max(0, delay - 60);
    var early = departure === null ? 240 : Math.max(0, end + result.flexiMenit - departure);
    result.psw = early >= 91 ? 4 : early >= 61 ? 3 : early >= 31 ? 2 : early > 0 ? 1 : 0;
    result.menitPsw = departure === null ? 0 : early;
    result.menitTanpaPresensi = (arrival === null ? 240 : 0) + (departure === null ? 240 : 0);
    result.potongan = [0,0.5,0.75,1.25][result.tl] + [0,0.5,0.75,1,1.25][result.psw];
    if (result.tl) totals.terlambat++;
    if (result.psw) totals.psw++;
    totals.menitTelat += result.menitTelat; totals.menitPsw += result.menitPsw;
    totals.menitTanpaPresensi += result.menitTanpaPresensi; totals.potonganAbsensi += result.potongan;
    return result;
  });
  totals.totalMenit = totals.menitTelat + totals.menitPsw + totals.menitTanpaPresensi;
  warnings = warnings.concat(employee.warnings || []);
  var amount = { tarif: null, bruto: null, persenPotongan: null, potongan: null, netto: null, skp: employee.skp,
    potonganSkp: employee.skp === null ? null : 100 - employee.skp };
  if (module === 'uang-makan') {
    amount.tarif = employee.uangMakan; amount.persenPotongan = employee.pajak;
    if (employee.uangMakan === null) warnings.push('Tarif Uang Makan belum tersedia/valid pada Data_Pegawai.');
    if (employee.pajak === null) warnings.push('Persentase pajak Uang Makan belum tersedia/valid pada Data_Pegawai.');
    if (amount.tarif !== null) amount.bruto = totals.masuk * amount.tarif;
  } else {
    amount.tarif = employee.tukin; amount.bruto = employee.tukin;
    if (employee.tukin === null) warnings.push('Besaran Tunjangan Kinerja belum tersedia/valid pada Data_Pegawai.');
    if (employee.skp === null) warnings.push('Nilai SKP belum tersedia/valid pada Data_Pegawai.');
    if (employee.skp !== null) amount.persenPotongan = 0.7 * (100 - employee.skp) + 0.3 * totals.potonganAbsensi;
    if (totals.potonganAbsensi > 100) warnings.push('Akumulasi potongan absensi melampaui 100%; perlu pemeriksaan aturan sebelum nominal ditetapkan.');
  }
  if (!warnings.length && amount.bruto !== null && amount.persenPotongan !== null) {
    amount.potongan = Math.round(amount.bruto * amount.persenPotongan / 100);
    amount.netto = amount.bruto - amount.potongan;
  }
  return { version: '2026-09-20', modul: module, jabatan: employee.jabatan, golongan: employee.golongan,
    sources: employee.sources || {}, totals: totals, amount: amount, days: days, warnings: warnings, complete: !warnings.length };
}
function payrollHeader_(value) { return text_(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function payrollNumber_(raw, display, percent) {
  if (raw === '' || raw === null || raw === undefined) return null;
  var number;
  if (typeof raw === 'number') number = raw * (percent && /%/.test(display) ? 100 : 1);
  else {
    var value = text_(raw).replace(/^Rp\.?\s*/i, '').replace(/\s|%/g, '');
    if (!percent && /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(value)) value = value.replace(/,/g, '');
    else if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(value)) value = value.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d+(,\d+)?$/.test(value)) value = value.replace(',', '.');
    else if (!/^-?\d+(\.\d+)?$/.test(value)) return null;
    number = Number(value);
  }
  return isFinite(number) && number >= 0 && (!percent || number <= 100) ? number : null;
}
function payrollEmployee_(record) {
  var sheet = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID).getSheetByName('Data_Pegawai');
  if (!sheet) throw new Error('Sheet Data_Pegawai tidak ditemukan.');
  var data = sheet.getDataRange().getValues(), headers = (data[0] || []).map(payrollHeader_);
  var nipCol = headers.indexOf('nip'), nameCol = headers.indexOf('nama');
  var matches = data.slice(1).map(function(row, i) { return { row: row, index: i + 2 }; }).filter(function(item) {
    return record.nip ? nipCol >= 0 && nip_(item.row[nipCol]) === record.nip : nameCol >= 0 && text_(item.row[nameCol]).toLowerCase() === record.nama.toLowerCase();
  });
  if (matches.length !== 1) throw new Error('Data_Pegawai harus mempunyai tepat satu data untuk NIP/nama ini (ditemukan ' + matches.length + ').');
  var match = matches[0], displays = sheet.getRange(match.index, 1, 1, headers.length).getDisplayValues()[0];
  var sources = {}, warnings = [];
  function read(field, aliases, percent, numeric) {
    var columns = headers.map(function(h, i) { return aliases.indexOf(h) >= 0 ? i : -1; }).filter(function(i) { return i >= 0; });
    if (columns.length !== 1) { if (columns.length > 1) warnings.push('Kolom ' + field + ' ambigu pada Data_Pegawai.'); return numeric ? null : ''; }
    var index = columns[0]; sources[field] = 'Data_Pegawai, baris ' + match.index + ', kolom ' + data[0][index];
    return numeric ? payrollNumber_(match.row[index], displays[index], percent) : text_(match.row[index]);
  }
  return { uangMakan: read('Uang Makan', ['uangmakan','tarifuangmakan','besaranuangmakan'], false, true),
    pajak: read('Pajak Uang Makan', ['pajak','pph','pph21','pajakum','pajakuangmakan','potonganuangmakan','persentasepajak'], true, true),
    tukin: read('Tunjangan Kinerja', ['tukin','tunjangankinerja','besarantunjangankinerja'], false, true),
    // Column S is Persentase SKP; R (Nilai SKP) is deliberately NOT a fallback.
    skp: read('SKP', ['persentaseskp'], true, true),
    jabatan: read('Jabatan', ['jabatan'], false, false), golongan: read('Golongan', ['golongan','gol','pangkatgolongan'], false, false), sources: sources, warnings: warnings };
}
function calculationMasterTarget_(record) {
  var sheet = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID).getSheetByName(eventSheetName_(record.modul));
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i > 0; i--) {
    if (nip_(values[i][1]) === record.nip && text_(values[i][3]) === record.periode && driveId_(values[i][9]) === record.spreadsheetId) return { sheet: sheet, row: i + 1, headers: values[0], values: values[i] };
  }
  throw new Error('Baris rekap pengumpulan tidak lagi cocok.');
}
function invalidateCalculation_(record) {
  var target = calculationMasterTarget_(record), groups = [];
  var owned = ['Hitung_Status','Hitung_Hari_Masuk','Hitung_Hari_Kerja','Hitung_Hari_Dinas','Hitung_Hari_Cuti','Hitung_Hari_TB','Hitung_Hari_Libur',
    'Hitung_Hari_Flexi','Hitung_Hari_Terlambat','Hitung_Hari_PSW','Hitung_Hari_Tidak_Masuk','Hitung_Menit_Terlambat','Hitung_Menit_PSW',
    'Hitung_Lupa_Absen','Hitung_Adjustment','Hitung_Tidak_Absen','Hitung_Adjustment_Bulanan',
    'Hitung_Menit_Tanpa_Presensi','Hitung_Total_Menit','Hitung_Potongan_Absensi_Persen','Hitung_Tarif','Hitung_SKP',
    'Hitung_Bruto','Hitung_Potongan_Persen','Hitung_Potongan_Rp','Hitung_Netto'];
  target.headers.forEach(function(header, i) {
    if (i < 10 || owned.indexOf(header) < 0) return;
    var group = groups[groups.length - 1];
    if (!group || group.column + group.values.length !== i + 1) { group = { column: i + 1, values: [] }; groups.push(group); }
    group.values.push(header === 'Hitung_Status' ? 'Menunggu perhitungan ulang' : '');
  });
  groups.forEach(function(group) { target.sheet.getRange(target.row, group.column, 1, group.values.length).setValues([group.values]); });
}
function saveCalculationNote_(state, calculation) {
  var folder = recordedFolder_(state.record), target = calculationMasterTarget_(state.record);
  var noteId = text_(state.saved.baseline.getRange(4, 2).getValue()) || text_(target.values[target.headers.indexOf('Catatan_Perhitungan_FileId')]);
  var file = null;
  if (noteId) {
    try { file = DriveApp.getFileById(noteId); } catch (error) {
      if (!/No file|not found|does not exist|No item with the given ID|tidak ditemukan/i.test(String(error.message))) throw error;
    }
    if (file && file.isTrashed()) file = null;
    if (file && (!hasOnlyParent_(file, folder.getId()) || file.getMimeType() !== 'text/plain')) throw new Error('Lokasi/jenis file catatan perhitungan tidak sesuai; tidak ditimpa.');
  }
  var lines = ['CATATAN PERHITUNGAN ' + (state.record.modul === 'tukin' ? 'TUNJANGAN KINERJA' : 'UANG MAKAN'),
    state.record.nama + ' | NIP ' + state.record.nip, 'Periode: ' + state.record.periode,
    'Status: ' + (calculation.complete ? 'Lengkap' : 'Perlu penyesuaian'),
    'Aturan: jam biasa 07:30–16:00 (Jumat 16:30); Ramadan 08:00–15:00 (Jumat 15:30).',
    'Flexi maksimal 60 menit. Pengganti jam pulang maksimal 60 menit. Absen kosong dikonversi 240 menit per presensi.',
    'TL: 0,5% / 0,75% / 1,25%. PSW: 0,5% / 0,75% / 1% / 1,25%. Dinas/Cuti/TB/Libur bebas TL/PSW.',
    'Potongan rupiah dibulatkan ke rupiah terdekat. Jam asli disimpan di baseline; koreksi disertai surat.', ''];
  calculation.days.forEach(function(day) {
    var description = day.status + ', jam ' + day.jamKerja + ', datang ' + day.datang + ', pulang ' + day.pulang;
    if (['WFO','WFA','WFH'].indexOf(day.status) >= 0) description += ', wajib pulang ' + day.wajibPulang + ', pengganti flexi ' + day.flexiMenit + ' menit';
    if (day.tl) description += ', keterlambatan TL ' + day.tl;
    if (day.psw) description += ', pulang sebelum waktunya PSW ' + day.psw;
    if (day.menitTanpaPresensi) description += ', tanpa presensi ' + day.menitTanpaPresensi + ' menit';
    Object.keys(day.adjustments || {}).forEach(function(punch) { var correction = day.adjustments[punch]; description += ', adjustment ' + punch + ' menjadi ' + correction.time + ' (surat ' + correction.fileId + ')'; });
    lines.push('Pada tanggal ' + day.tanggal + ': ' + description + '. Potongan absensi ' + day.potongan + '%.');
  });
  var t = calculation.totals, a = calculation.amount;
  function money(value) { return value === null ? 'Belum dapat dihitung' : 'Rp ' + Number(value).toLocaleString('id-ID'); }
  lines.push('', 'RINGKASAN', 'Masuk kerja / hari kerja: ' + t.masuk + ' / ' + t.hariKerja,
    'Dinas: ' + t.dinas + ' hari; Cuti: ' + t.cuti + ' hari; Tugas Belajar: ' + t.tb + ' hari; Libur: ' + t.libur + ' hari.',
    'Flexi: ' + t.flexi + ' hari; Terlambat: ' + t.terlambat + ' hari; PSW: ' + t.psw + ' hari; Tanpa kedua presensi: ' + t.tidakMasuk + ' hari.',
    'Kekurangan menit: terlambat ' + t.menitTelat + ', pulang awal ' + t.menitPsw + ', tanpa presensi ' + t.menitTanpaPresensi + ', total ' + t.totalMenit + '.',
    'Akumulasi potongan absensi: ' + t.potonganAbsensi + '%.',
    'Lupa absen: ' + t.lupaAbsen + ' kejadian; adjustment: ' + t.adjusted + '; tidak absen: ' + t.unadjusted + '. Per bulan: ' + JSON.stringify(t.adjustmentMonths),
    'Tarif dasar: ' + money(a.tarif), 'Bruto: ' + money(a.bruto),
    'Potongan: ' + money(a.potongan) + ' (' + (a.persenPotongan === null ? 'belum tersedia' : a.persenPotongan + '%') + ')',
    'Diterima: ' + money(a.netto));
  if (state.record.modul === 'tukin') lines.push('Rumus: 70% × (100% − SKP ' + a.skp + '%) + 30% × potongan absensi ' + t.potonganAbsensi + '%.');
  else lines.push('Rumus: ' + t.masuk + ' hari masuk × ' + money(a.tarif) + ', dikurangi potongan sesuai Data_Pegawai.');
  Object.keys(calculation.sources).forEach(function(key) { lines.push('Sumber ' + key + ': ' + calculation.sources[key]); });
  calculation.warnings.forEach(function(warning) { lines.push('PERLU DIPERIKSA: ' + warning); });
  var content = lines.join('\n');
  if (file) file.setContent(content);
  else file = folder.createFile(Utilities.newBlob(content, 'text/plain', 'Catatan_Perhitungan_' + state.record.modul + '_' + state.record.nip + '_' + state.record.spreadsheetId + '.txt'));
  state.saved.baseline.getRange(4, 2).setValue(file.getId()); // Retry updates this exact tracked file, never a name match.
  return { fileId: file.getId(), url: file.getUrl(), fileName: file.getName() };
}
function writeCalculationMaster_(record, calculation, note) {
  var target = calculationMasterTarget_(record), t = calculation.totals, a = calculation.amount;
  var entries = { Hitung_Status: calculation.complete ? 'Lengkap' : 'Perlu penyesuaian', Hitung_Hari_Masuk: t.masuk, Hitung_Hari_Kerja: t.hariKerja,
    Hitung_Lupa_Absen: t.lupaAbsen, Hitung_Adjustment: t.adjusted, Hitung_Tidak_Absen: t.unadjusted, Hitung_Adjustment_Bulanan: JSON.stringify(t.adjustmentMonths),
    Hitung_Hari_Dinas: t.dinas, Hitung_Hari_Cuti: t.cuti, Hitung_Hari_TB: t.tb, Hitung_Hari_Libur: t.libur,
    Hitung_Hari_Flexi: t.flexi, Hitung_Hari_Terlambat: t.terlambat, Hitung_Hari_PSW: t.psw, Hitung_Hari_Tidak_Masuk: t.tidakMasuk,
    Hitung_Menit_Terlambat: t.menitTelat, Hitung_Menit_PSW: t.menitPsw, Hitung_Menit_Tanpa_Presensi: t.menitTanpaPresensi, Hitung_Total_Menit: t.totalMenit,
    Hitung_Potongan_Absensi_Persen: t.potonganAbsensi, Hitung_Tarif: a.tarif, Hitung_SKP: a.skp,
    Hitung_Bruto: a.bruto, Hitung_Potongan_Persen: a.persenPotongan, Hitung_Potongan_Rp: a.potongan, Hitung_Netto: a.netto,
    Catatan_Perhitungan_FileId: note.fileId, Catatan_Perhitungan_URL: note.url };
  var headers = target.headers.slice(), updates = [];
  Object.keys(entries).forEach(function(header) {
    var column = headers.indexOf(header);
    if (column < 0) { column = Math.max(10, headers.length); while (headers.length < column) headers.push(''); headers.push(header); }
    if (column < 10 || headers.lastIndexOf(header) !== column) throw new Error('Header perhitungan bentrok/duplikat: ' + header);
    updates.push({ column: column + 1, header: header, value: entries[header] === null ? '' : entries[header] });
  });
  if (headers.length > target.sheet.getMaxColumns()) target.sheet.insertColumnsAfter(target.sheet.getMaxColumns(), headers.length - target.sheet.getMaxColumns());
  updates.sort(function(a,b) { return a.column - b.column; });
  var groups = [];
  updates.forEach(function(item) { var group = groups[groups.length - 1]; if (!group || group[group.length-1].column + 1 !== item.column) { group=[]; groups.push(group); } group.push(item); });
  groups.forEach(function(group) {
    target.sheet.getRange(1, group[0].column, 1, group.length).setValues([group.map(function(item) { return item.header; })]);
    target.sheet.getRange(target.row, group[0].column, 1, group.length).setValues([group.map(function(item) { return item.value; })]);
  });
}

// Daily facts support calendar-month analytics without rereading each employee Drive file.
var DAILY_HEADERS = ['Modul','NIP','Nama','Periode','SpreadsheetId','Tanggal','Keterangan','JamKerja','Datang','Pulang',
  'TL','PSW','FlexiMenit','LupaAbsen','Adjustment','TidakAbsen','MenitTanpaPresensi','Hadir','Dokumen','Diperbarui'];
function dailyRecapSheet_(create) {
  var book = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID), sheet = book.getSheetByName('REKAP_HARIAN');
  if (!sheet && create) { sheet = book.insertSheet('REKAP_HARIAN'); sheet.appendRow(DAILY_HEADERS); sheet.setFrozenRows(1); }
  if (sheet && JSON.stringify(sheet.getRange(1,1,1,DAILY_HEADERS.length).getValues()[0]) !== JSON.stringify(DAILY_HEADERS)) throw new Error('Header REKAP_HARIAN berbeda. Jangan menimpa sheet yang sudah digunakan untuk keperluan lain.');
  return sheet;
}
function saveDailyRecap_(state, calculation) {
  var sheet = dailyRecapSheet_(true), record = state.record, values = sheet.getDataRange().getValues();
  var index = {}, duplicate = {};
  values.slice(1).forEach(function(row,i) {
    if (row[0] !== record.modul || nip_(row[1]) !== record.nip || row[3] !== record.periode) return;
    var date = isoDate_(row[5]); if (index[date]) duplicate[date] = true; index[date] = i + 2;
  });
  if (Object.keys(duplicate).length) throw new Error('REKAP_HARIAN mempunyai tanggal ganda pada submisi ini. Periksa data sebelum menyimpan.');
  var archive = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID).getSheetByName('REKAP_SPT');
  var archiveRows = archive ? archive.getDataRange().getValues().slice(1) : [];
  var registry = registryRows_(), stamp = new Date().toISOString();
  var updates = calculation.days.map(function(day) {
    var sourceRow = state.rows.filter(function(row) { return row.tanggal === day.tanggal; })[0];
    var docs = (sourceRow.dokumen || []).concat(state.documents.filter(function(doc) { return ['spt','cuti'].indexOf(doc.jenisDokumen) < 0; })).map(function(doc) {
      var entry = registry.filter(function(e) { return e.fileId === doc.fileId && sameScope_(e,record); })[0];
      if (!entry) return null;
      var original = archiveRows.filter(function(row) { return nip_(row[1]) === record.nip && driveId_(row[9]) === entry.sourceFileId; })[0];
      return { id: entry.sourceFileId || entry.fileId, fileId:entry.fileId, type:entry.jenisDokumen, tujuan: entry.jenisDokumen === 'spt' && original ? text_(original[3]) : '' };
    }).filter(function(doc) { return !!doc; });
    var arrival = attendanceMinutes_(day.datang), departure = attendanceMinutes_(day.pulang);
    var isWork = ['WFO','WFA','WFH'].indexOf(day.status) >= 0;
    var missing = day.lupaAbsen || 0;
    return { row: index[day.tanggal] || ++values.length, values: [record.modul,"'"+record.nip,record.nama,record.periode,record.spreadsheetId,day.tanggal,
      day.status,day.jamKerja,day.datang,day.pulang,day.tl,day.psw,day.flexiMenit,missing,day.adjusted || 0,Math.max(0,missing-(day.adjusted||0)),day.menitTanpaPresensi,
      isWork && (arrival !== null || departure !== null || day.adjusted > 0),JSON.stringify(docs),stamp] };
  });
  updates.sort(function(a,b) { return a.row - b.row; });
  var groups = [];
  updates.forEach(function(update) { var group = groups[groups.length-1]; if (!group || group.row + group.values.length !== update.row) { group={row:update.row,values:[]};groups.push(group); } group.values.push(update.values); });
  groups.forEach(function(group) { if (group.row + group.values.length - 1 > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(),group.row + group.values.length - 1 - sheet.getMaxRows()); sheet.getRange(group.row,6,group.values.length,1).setNumberFormat('@'); sheet.getRange(group.row,9,group.values.length,2).setNumberFormat('@'); sheet.getRange(group.row,1,group.values.length,DAILY_HEADERS.length).setValues(group.values); });
}
function monthlyRecap_(payload) {
  eventSheetName_(payload.modul);
  var wanted = text_(payload.month);
  if (wanted && !/^\d{4}-(0[1-9]|1[0-2])$/.test(wanted)) throw new Error('Bulan rekap harus yyyy-mm.');
  var sheet = dailyRecapSheet_(false), all = sheet ? sheet.getDataRange().getValues().slice(1) : [];
  var book = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID), master = book.getSheetByName(eventSheetName_(payload.modul));
  var masterRows = master ? master.getDataRange().getValues() : [], headers = masterRows[0] || [], statusCol = headers.indexOf('Hitung_Status');
  var current = {};
  masterRows.slice(1).forEach(function(row) {
    // Only the latest master record for a NIP/period is authoritative.
    current[nip_(row[1])+'|'+text_(row[3])] = { id:driveId_(row[9]),status:statusCol>=0?row[statusCol]:'' };
  });
  var valid = all.filter(function(row) { var record=current[nip_(row[1])+'|'+text_(row[3])]; return row[0]===payload.modul && record && record.id===row[4] && ['Lengkap','Perlu penyesuaian'].indexOf(record.status)>=0; });
  valid.forEach(function(row) { row[5] = isoDate_(row[5]); });
  var months = Array.from(new Set(valid.map(function(row) { return row[5].slice(0,7); }))).sort().reverse();
  var month = wanted || months[0] || '', chosen = {};
  valid.filter(function(row) { return text_(row[5]).slice(0,7)===month; }).forEach(function(row) {
    var key=nip_(row[1])+'|'+row[5];
    if (!chosen[key] || text_(row[19])>text_(chosen[key][19])) chosen[key]=row;
  });
  var peopleSheet=book.getSheetByName('Data_Pegawai'), people=peopleSheet?peopleSheet.getDataRange().getValues():[], ph=(people[0]||[]).map(payrollHeader_);
  var byNip={}, nipCol=ph.indexOf('nip');
  people.slice(1).forEach(function(row) { var key=nip_(row[nipCol]); if(key) { if(byNip[key]) throw new Error('NIP ganda pada Data_Pegawai. Periksa sumber filter SubUnit.'); byNip[key]=row; } });
  function employeeField(person,names) { for(var i=0;i<names.length;i++){var col=ph.indexOf(names[i]);if(col>=0)return text_(person[col]);}return ''; }
  var employees={}, daily=[], documents={};
  Object.keys(chosen).forEach(function(key) {
    var row=chosen[key], nip=nip_(row[1]), person=byNip[nip]||[], status=text_(row[6]);
    if(!employees[nip]) {
      var photo=employeeField(person,['fotopegawai','foto','linkfoto']), photoId=driveId_(photo);
      employees[nip]={nip:nip,nama:employeeField(person,['nama'])||row[2],unit:employeeField(person,['subunitkerja','subunit'])||'SubUnit belum diisi',photo:photoId?'https://lh3.googleusercontent.com/d/'+photoId+'=s200':'',
        masuk:0,hariKerja:0,dinas:0,cuti:0,tb:0,terlambat:0,psw:0,lupaAbsen:0,adjusted:0,unadjusted:0,assessed:0,clean:0,onTime:0,arrivalSum:0,arrivalCount:0};
    }
    var employee=employees[nip], work=['WFO','WFA','WFH'].indexOf(status)>=0, holiday=status==='Libur';
    var arrival=work?attendanceMinutes_(row[8]):null, present=work&&(row[17]===true||row[17]==='TRUE'||row[17]==='true');
    if(!holiday)employee.hariKerja++; if(present)employee.masuk++;
    if(status==='Dinas')employee.dinas++; if(status==='Cuti')employee.cuti++; if(status==='TB')employee.tb++;
    employee.terlambat+=Number(row[10])>0?1:0;employee.psw+=Number(row[11])>0?1:0;
    employee.lupaAbsen+=Number(row[13])||0;employee.adjusted+=Number(row[14])||0;employee.unadjusted+=Number(row[15])||0;
    if(status==='WFO'){
      employee.assessed++;
      if(!Number(row[10])&&!Number(row[11])&&!Number(row[13])&&present)employee.clean++;
      if(arrival!==null&&arrival<=(row[7]==='ramadan'?480:450))employee.onTime++;
      if(arrival!==null){employee.arrivalSum+=arrival;employee.arrivalCount++;}
    }
    daily.push({nip:nip,tanggal:text_(row[5]),status:status,libur:holiday,hadir:present,arrival:arrival});
    var docs;
    try{docs=JSON.parse(text_(row[18])||'[]');}catch(error){throw new Error('Rincian dokumen REKAP_HARIAN tidak valid.');}
    docs.forEach(function(doc){documents[nip+'|'+doc.type+'|'+doc.id]={nip:nip,type:doc.type,id:doc.id,tujuan:doc.tujuan};});
  });
  return {status:'success',month:month,months:months,employees:Object.keys(employees).map(function(nip){var employee=employees[nip];employee.avgArrival=employee.arrivalCount?Math.round(employee.arrivalSum/employee.arrivalCount):null;delete employee.arrivalSum;delete employee.arrivalCount;return employee;}),daily:daily,documents:Object.keys(documents).map(function(key){return documents[key];})};
}

// Optional, run manually in Apps Script once to populate dates for older records.
// Does not delete rows, create Drive copies, or alter attendance statuses.
function isiTanggalArsipDanKlaimLama() {
  var lock = LockService.getScriptLock(), report = { updated: 0, skipped: [], warnings: [] };
  try {
    lock.waitLock(30000);
    var book = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    ['REKAP_SPT', 'REKAP_CUTI', 'REKAP _SPT'].forEach(function(name) {
      var sheet = book.getSheetByName(name);
      if (!sheet) return;
      sheet.getDataRange().getValues().slice(1).forEach(function(row, i) {
        if (!nip_(row[1])) return;
        try {
          var type = name === 'REKAP_CUTI' ? 'cuti' : 'spt';
          var dates = archiveDateList_(row[4], row[5], type);
          writeDateColumns_(sheet, i + 2, 11, dates); report.updated++;
          if (type === 'cuti') {
            var warning = cutiCountWarning_(dates, row[6]);
            if (warning) report.warnings.push(name + ' baris ' + (i + 2) + ': ' + warning);
          }
        }
        catch (error) { report.skipped.push(name + ' baris ' + (i + 2) + ': ' + error.message); }
      });
    });
    registryRows_().forEach(function(entry) {
      try {
        writeDateColumns_(registry_(false), entry.row, 15, sourceDates_(entry.sourceFileId, entry.jenisDokumen, entry, false));
        report.updated++;
      } catch (error) { report.skipped.push(ATTACHMENT_SHEET + ' baris ' + entry.row + ': ' + error.message); }
    });
    Logger.log(JSON.stringify(report));
    return report;
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
