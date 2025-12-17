sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
    "use strict";

    return Controller.extend("zpsrhercsummr.controller.zpsrhercsummr", {

        onInit: function () {
            // Filter model
            var oFilterModel = new JSONModel({
                RSM: "",
                TDM: "",
                ADR: ""
            });
            this.getView().setModel(oFilterModel, "filterModel");

            // Data model
            var oDataModel = new JSONModel({
                PSRData: []
            });
            this.getView().setModel(oDataModel, "dataModel");

            // Use OData model from manifest.json
            this._oDataModel = this.getOwnerComponent().getModel(); // default model
        },

        onSearch: function () {
            var oFilterModel = this.getView().getModel("filterModel");
            var oData = oFilterModel.getData();

            var aFilters = [];
            Object.keys(oData).forEach(function (key) {
                if (oData[key]) {
                    var fieldName = key === "TDM" ? "TDMName" : key; // mapping if needed
                    aFilters.push(new Filter(fieldName, FilterOperator.EQ, oData[key]));
                }
            });

            this._loadData(aFilters);
        },

        _loadData: function (aFilters) {
            var that = this;

            this._oDataModel.read("/ZDDLS_PSR_HERC_CNSM", {
                filters: aFilters,
                success: function (oData) {
                    const adrData = that._groupByADR(oData.results);
                    that.getView().getModel("dataModel").setProperty("/PSRData", adrData);
                    MessageToast.show("Data loaded: " + adrData.length + " ADR(s) found");
                },
                error: function (oError) {
                    MessageToast.show("Error loading data");
                    console.error(oError);
                }
            });
        },

        _groupByADR: function (aResults) {
            const grouped = {};
            aResults.forEach(item => {
                if (!grouped[item.ADR]) {
                    grouped[item.ADR] = { ADR: item.ADR, PSRs: [] };
                }
                grouped[item.ADR].PSRs.push(item);
            });
            return Object.values(grouped);
        },

        _calculatePercentage: function (value, total) {
            if (!total || total === 0) return "0%";
            return ((parseFloat(value) / parseFloat(total)) * 100).toFixed(1) + "%";
        },

        _calculateRatio: function (value1, value2) {
            if (!value2 || value2 === 0) return 0;
            return (parseFloat(value1) / parseFloat(value2)).toFixed(1);
        },

        onExportToPDF: function () {
            var that = this;

            this._ensureJSPDFLoaded().then(function () {
                const data = that.getView().getModel("dataModel").getProperty("/PSRData");
                if (!data || !data.length) {
                    MessageToast.show("No data to export");
                    return;
                }

                const doc = new jsPDF('p', 'mm', 'a4');
                data.forEach((adr, i) => {
                    if (i > 0) doc.addPage();
                    that._generatePDF(doc, adr);
                });

                doc.save("PSR_Summary_Report.pdf");
            }).catch(err => {
                MessageToast.show("Failed to load PDF library: " + err);
            });
        },

        _ensureJSPDFLoaded: function () {
            return new Promise(function (resolve, reject) {
                if (window.jsPDF && typeof jsPDF === 'function') {
                    resolve();
                    return;
                }

                var script1 = document.createElement('script');
                script1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                script1.onload = function () {
                    if (window.jspdf && window.jspdf.jsPDF) {
                        window.jsPDF = window.jspdf.jsPDF;

                        var script2 = document.createElement('script');
                        script2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js";
                        script2.onload = function () { setTimeout(resolve, 100); };
                        script2.onerror = function () { reject("Failed to load jsPDF AutoTable plugin"); };
                        document.head.appendChild(script2);
                    } else {
                        reject("jsPDF object not found after loading");
                    }
                };
                script1.onerror = function () { reject("Failed to load jsPDF library"); };
                document.head.appendChild(script1);
            });
        },
        

        _generatePDF: function (doc, adrData) {

                const pageWidth = doc.internal.pageSize.width;    
                const margin = 8;
                let yPos = 14;                   //8 THA PEHEL 
                const psrs = adrData.PSRs;
                
                const adrName = adrData.ADR || "";
                const totalDays = Number(psrs[0]?.TotalDaysInMonth_F ?? 0);
                const daysPassed = Number(psrs[0]?.DaysPassed_F ?? 0);
             
                
                const daysPercent = totalDays
                    ? ((daysPassed / totalDays) * 100).toFixed(1)
                    : "0.0";

                // ===== TITLE =====
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("PSR Summary Report", pageWidth / 2, yPos, { align: "center" } ); 
                yPos += 6;

                // ===== LEFT SIDE =====
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.text(
                    `ADR: ${adrName
                        .toLowerCase()
                        .split(" ")
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}`,
                    margin,
                    yPos
                );

                // ===== RIGHT SIDE =====
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(60, 60, 60); 
                doc.text(`Working Days: ${totalDays}`, pageWidth - margin, yPos - 4, { align: "right" });
                doc.text(`Days Passed: ${daysPassed} (${daysPercent}%)`, pageWidth - margin, yPos, { align: "right" });

                // reset color
                doc.setTextColor(0, 0, 0);

                yPos += 6;
                // doc.setFontSize(14).setFont(undefined, 'bold');
                // doc.text(`PSR Summary Report`, 105, yPos, { align: "center" });
                // yPos += 6;

                // doc.setFontSize(11);
                // doc.text(
                //     `ADR: ${adrData.ADR.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
                //     margin,
                //     yPos
                // );
                // yPos += 4;


                // ===== PSR INFORMATION =====
                const psrInfoRows = [
                    ["Date", ...psrs.map(p => p.ActivityDate_T)],
                    ["PSR ID", ...psrs.map(p => p.PSR_ID)],
                    ["PSR Name", ...psrs.map(p => p.PSRName)],
                    ["TDM Name", ...psrs.map(p => p.TDMName)],
                    ["Start Day", ...psrs.map(p => p.StartTime_T)],
                    ["End Day", ...psrs.map(p => p.EndTime_T)],
                    ["Duration", ...psrs.map(p => p.Duration)]
                ];

                doc.autoTable({
                    startY: yPos,
                    body: psrInfoRows,
                    theme: 'grid',
                    styles: { fontSize: 6, cellPadding: 0.4 },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 30 }
                    }
                });

                yPos = doc.lastAutoTable.finalY + 6;

//                 // ===== PSR Time Info  =====
//                 function calculateSaleTargetAch(oData, index = 1) {
//                 const mtdSaleData = oData?.sale?.[index]; // safely access MTD sale
//                 if (mtdSaleData?.trg && mtdSaleData?.FTDSalein250ml) {
//                     return ((mtdSaleData.FTDSalein250ml / mtdSaleData.trg) * 100).toFixed(1) + "%";
//                 }
//                 return "0%";
// }
//                const psrTimeRows = [
//                 ["Working Days Passed", ...psrs.map(p => p.DaysPassed_F ?? 0)],
//                 ["Month Target Ach %", ...psrs.map(p => calculateSaleTargetAch(p))],
//                 ["Prior Day Orders", ...psrs.map(p => p.PriorDayOrders_F ?? 0)]
//             ];

//                 // doc.text("PSR Time Info", margin, yPos);
//                 // yPos += 3;

//                 doc.autoTable({
//                     startY: yPos,
//                     head: [[" ", ...psrs.map(p => p.PSR_ID)]],
//                     body: psrTimeRows,
//                     theme: "grid",
//                     styles: {
//                         fontSize: 6,
//                         cellPadding: 0.4,
//                         halign: "center"
//                     },
//                     columnStyles: {
//                         0: { fontStyle: "bold", halign: "left", cellWidth: 35 }
//                     }
//                 });
//                 yPos = doc.lastAutoTable.finalY + 6;


                // ===== VISITS SUMMARY =====
                const SaleTargetAchievement = (p) => {
                return p?.trg && p?.FTDSalein250ml
                   ? ((parseFloat(p.FTDSalein250ml) / parseFloat(p.trg)) * 100).toFixed(1) + "%": "0%"; };

                const PercTime = (p) => {
                    return p?.TotalTimeinOutlet && p?.TotalDurationinMins
                    ? ((parseFloat(p.TotalTimeinOutlet) / parseFloat(p.TotalDurationinMins)) * 100).toFixed(2) + "%": "0.00%";};


                const visitRows = [
                    ["Prior Day Orders", ...psrs.map(p => p.PriorDayOrders_F ?? 0)],
                    ["No Deliveries ", ...psrs.map(p => p.NoDeliverYesterday_F ?? 0)],
                    ["Avg Time in Outlet", ...psrs.map(p =>  p?.AvgTimeInOutlet != null? parseFloat(p.AvgTimeInOutlet).toFixed(2): "0.00")],
                    ["% of Time",  ...psrs.map(p => PercTime(p))],
                    ["Month Target Ach %", ...psrs.map(p => SaleTargetAchievement(p))],
                    ["Planned", ...psrs.map(p => p.PlannedOutlets_F)],
                    ["Completed", ...psrs.map(p => p.CompletedOutlets_F)],
                    ["Not Completed", ...psrs.map(p => p.NotCompleted_F)],
                    ["Unplanned", ...psrs.map(p => p.UnplannedOutlets_F)],
                    ["Productive", ...psrs.map(p => p.ProductiveOutlets_F)],
                    ["Unproductive", ...psrs.map(p => p.UnproductiveOutlets_F)],
                    ["Total Orders", ...psrs.map(p => (p.ProductiveOutlets_F ?? 0) + (p.UnplannedOutlets_F ?? 0))]
                
                ];

                doc.setFont(undefined, 'bold');
                doc.text("PSR Visits Info", margin, yPos);
                yPos += 3;

                doc.autoTable({
                    startY: yPos,
                    head: [[" ", ...psrs.map(p => p.PSR_ID)]],
                    body: visitRows,
                    theme: 'grid',
                    styles: { fontSize: 6, cellPadding: 0.4 },
                    headStyles: {
                        fillColor: [13, 71, 161],   
                        textColor: [255, 255, 255], 
                        fontStyle: "bold",
                        halign: "center"
                    },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 } }
                });

                yPos = doc.lastAutoTable.finalY + 6;

                // ===== CALL COMPLETION / STRIKE RATE =====
                doc.setFont(undefined, "bold");
                doc.text("Call Completion / Strike Rate", margin, yPos);
                yPos += 3;

                const ccsrBody = [];

                /* ==== FTD ==== */
                psrs.forEach((psr, index) => {
                    ccsrBody.push([
                        index === 0 ? "FTD" : "",          
                        psr.PSR_ID,
                        psr.CompletedOutlets ?? 0,
                        psr.FTDCompletedCallsWithin50m_F ?? 0,
                        psr.FTDCallCompletionPct_F ?? "0%",        //ghalt h 
                        psr.ProductiveOutlets ?? 0,
                        psr.FTDStrikeRateWithin50m ?? 0,
                        psr.FTDStrikeRatePct_F ?? "0%"
                    ]);
                });

                /* === MTD ==== */
                psrs.forEach((psr, index) => {
                    ccsrBody.push([
                        index === 0 ? "MTD" : "",          
                        psr.PSR_ID,
                        psr.MTDCompletedOutlets ?? 0,
                        psr.MTDCompletedCallsWithin50m ?? 0,
                        psr.MTDCallCompletionPct_F ?? "0%",
                        psr.MTDProductiveOutlets?? 0,
                        psr.MTDStrikeRateWithin50m ?? 0,
                        psr.MTDStrikeRatePct_F ?? "0%"
                    ]);
                });
             
                   doc.autoTable({
                    startY: yPos,
                    head: [[
                        "Type",
                        "PSR",
                        "CC Total",
                        "CC GPS",
                        "CC %",
                        "SR Total",
                        "SR GPS",
                        "SR %"
                    ]],
                    body: ccsrBody,
                    theme: "grid",

                   
                    headStyles: {
                        fillColor: [13, 71, 161],   
                        textColor: [255, 255, 255], 
                        fontStyle: "bold",
                        halign: "center"
                    },

                    styles: {
                        fontSize: 6,
                        cellPadding: 0.4,
                        halign: "center"
                    },
                    columnStyles: {
                        0: { fontStyle: "bold", cellWidth: 12 },
                        1: { fontStyle: "bold", cellWidth: 18 }
                    }
                });

                yPos = doc.lastAutoTable.finalY + 6;

                // ===== ORDER =====
                doc.text("Order", margin, yPos);
                yPos += 3;

                doc.autoTable({
                    startY: yPos,
                    head: [["Type", ...psrs.map(p => p.PSR_ID)]],
                    body: [
                        ["FTD Qty", ...psrs.map(p => p.FTDOrderQty_F)],
                        ["MTD Qty", ...psrs.map(p => p.MTDOrderQty_F)]
                    ],
                    theme: 'grid',
                    styles: { fontSize: 6 }
                });

                yPos = doc.lastAutoTable.finalY + 6;

                // ===== SALE =====
                doc.text("Sale", margin, yPos);
                yPos += 3;

                doc.autoTable({
                    startY: yPos,
                    head: [["Type", ...psrs.map(p => p.PSR_ID)]],
                    body: [
                        ["FTD Sale", ...psrs.map(p => p.FTDSalePhysical_F)],
                        ["MTD Sale", ...psrs.map(p => p.MTDSalePhysical_F)]
                    ],
                    theme: 'grid',
                    styles: { fontSize: 6 }
                });
            },


        _addSectionHeader: function (pdf, x, y, text) {
            pdf.setFillColor(220, 220, 220);
            pdf.rect(x, y - 4, 190, 6, 'F');
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'bold');
            pdf.text(text, x + 2, y);
        }

    });
});
