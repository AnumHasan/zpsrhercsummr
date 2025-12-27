sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
    "use strict";

     // =====  FUNCTIONS =====
    const sumArr = (arr) => arr.reduce((a, b) => a + (parseFloat(b) || 0), 0);
    const div = (a, b, f = 1) => b ? (a / b).toFixed(f) : "0.0";
    const pct = (a, b, f = 1) => b ? ((a / b) * 100).toFixed(f) + "%" : "0%";

    return Controller.extend("zpsrhercsummr.controller.zpsrhercsummr", {
        onInit: function () {
                // Filter model
                var oFilterModel = new JSONModel({
                    SALESORG: "",
                    RSM: "",
                    TDM: "",
                    ADR: ""
                });
                this.getView().setModel(oFilterModel, "filterModel");

                // Data model
                var oDataModel = new JSONModel({
                    PSRData: [],
                    allSalesOrgs: [],
                    allRSMs: [],
                    allTDMs: [],
                    allADRs: []
                });
                this.getView().setModel(oDataModel, "dataModel");

                // Use OData model from manifest.json
                this._oDataModel = this.getOwnerComponent().getModel(); 

                // 👇 
                this._loadDistinctDropdownValues();
            },
        // onInit: function () {
        //     // Filter model
        //     var oFilterModel = new JSONModel({
        //         SALESORG: "",
        //         RSM: "",
        //         TDM: "",
        //         ADR: ""

        //     });
        //     this.getView().setModel(oFilterModel, "filterModel");

        //     // Data model
        //     var oDataModel = new JSONModel({
        //         PSRData: []
        //     });
        //     this.getView().setModel(oDataModel, "dataModel");

        //     // Use OData model from manifest.json
        //     this._oDataModel = this.getOwnerComponent().getModel(); 
        //},

        // onSearch: function () {
        //     var oFilterModel = this.getView().getModel("filterModel");
        //     var oData = oFilterModel.getData();

        //     var aFilters = [];
        //     Object.keys(oData).forEach(function (key) {
        //         // if (oData[key]) {
        //         //     var fieldName = key === "TDM" ? "TDMName" : 
        //         //           key === "SaleOrg" ? "SaleOrg" : key; // ADDED mapping
        //         //     aFilters.push(new Filter(fieldName, FilterOperator.EQ, oData[key]));
        //         // }
        //         if (oData.SALESORG) {
        //             aFilters.push(new Filter("SaleOrg", FilterOperator.EQ, oData.SALESORG));
        //         }
        //         if (oData.RSM) {
        //             aFilters.push(new Filter("RSM", FilterOperator.EQ, oData.RSM));
        //         }
        //         if (oData.TDM) {
        //             aFilters.push(new Filter("TDMName", FilterOperator.EQ, oData.TDM));
        //         }
        //         if (oData.ADR) {
        //             aFilters.push(new Filter("ADR", FilterOperator.EQ, oData.ADR));
        //         }

        //     });

        //     this._loadData(aFilters);
        // },

           
            _loadDistinctDropdownValues: function () {
                var oModel = this._oDataModel; 
                var that = this;
                oModel.read("/ZDDLS_PSR_HERC_CNSM", {
                    urlParameters: {
                        "$select": "SaleOrg,RSM,TDMName,ADR",
                        "$top": "50" // Limit to first 50 records for performance
                    },
                    success: function (oData) {
                        var results = oData.results;

                        // Helper: get unique sorted values
                        function getUnique(arr, key) {
                            return [...new Set(arr.map(item => item[key]).filter(v => v))].sort();
                        }

                        var allSalesOrgs = getUnique(results, "SaleOrg").map(v => ({ SALESORG: v }));
                        var allRSMs = getUnique(results, "RSM").map(v => ({ RSM: v }));
                        var allTDMs = getUnique(results, "TDMName").map(v => ({ TDM: v })); // note: TDMName → TDM
                        var allADRs = getUnique(results, "ADR").map(v => ({ ADR: v }));

                        // Get or create dataModel
                        var dataModel = this.getView().getModel("dataModel");
                        if (!dataModel) {
                            dataModel = new sap.ui.model.json.JSONModel({
                                PSRData: [],
                                allSalesOrgs: [],
                                allRSMs: [],
                                allTDMs: [],
                                allADRs: []
                            });
                            this.getView().setModel(dataModel, "dataModel");
                        }

                        // Update with dropdown lists
                        dataModel.setProperty("/allSalesOrgs", allSalesOrgs);
                        dataModel.setProperty("/allRSMs", allRSMs);
                        dataModel.setProperty("/allTDMs", allTDMs);
                        dataModel.setProperty("/allADRs", allADRs);

                      
                    }.bind(this),
                    error: function (oError) {
                        console.error("Error loading dropdown values", oError);
                        sap.m.MessageToast.show("Failed to load dropdown options");
                    }
                });
            },
           onSearch: function () {
                var oFilterModel = this.getView().getModel("filterModel");
                var oData = oFilterModel.getData();

                var aFilters = [];

                if (oData.SALESORG) {
                    aFilters.push(new sap.ui.model.Filter("SaleOrg", sap.ui.model.FilterOperator.EQ, oData.SALESORG));
                }

                if (oData.RSM) {
                    aFilters.push(new sap.ui.model.Filter("RSM", sap.ui.model.FilterOperator.EQ, oData.RSM));
                }

                if (oData.TDM) {
                    aFilters.push(new sap.ui.model.Filter("TDMName", sap.ui.model.FilterOperator.EQ, oData.TDM));
                }

                if (oData.ADR) {
                    aFilters.push(new sap.ui.model.Filter("ADR", sap.ui.model.FilterOperator.EQ, oData.ADR));
                }

                this._loadData(aFilters);
            }
,

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

        _groupByTDM: function (adrDataArray) {
            const tdmGroups = {};
            
            adrDataArray.forEach(adr => {
                adr.PSRs.forEach(psr => {
                    const tdmName = psr.TDMName || "Unknown TDM";
                    if (!tdmGroups[tdmName]) {
                        tdmGroups[tdmName] = {
                            TDMName: tdmName,
                            PSRs: []
                        };
                    }
                    tdmGroups[tdmName].PSRs.push(psr);
                });
            });
            
            return Object.values(tdmGroups);
        },

        _groupBySalesOrg: function (adrDataArray) {
            const salesOrgGroups = {};
            
            adrDataArray.forEach(adr => {
                adr.PSRs.forEach(psr => {
                    const salesOrg = psr.SaleOrg  || "Unknown SalesOrg"; 
                    if (!salesOrgGroups[salesOrg]) {
                        salesOrgGroups[salesOrg] = {
                            SalesOrg: salesOrg,
                            PSRs: []
                        };
                    }
                    salesOrgGroups[salesOrg].PSRs.push(psr);
                });
            });
            
            return Object.values(salesOrgGroups);
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
            const oFilterModel = that.getView().getModel("filterModel");
            const filterData = oFilterModel.getData();

            // Generate individual ADR reports
            data.forEach((adr, i) => {
                if (i > 0) doc.addPage();
                that._generatePDF(doc, adr);
            });

            // If SalesOrg is searched, generate SalesOrg wise summaries
            if (filterData.SalesOrg) {
                const salesOrgGroups = that._groupBySalesOrg(data);
                
                salesOrgGroups.forEach(salesOrgGroup => {
                    doc.addPage();
                    that._generateSalesOrgAggregatedSummary(doc, salesOrgGroup);
                });
            }

            // If RSM is searched (and no specific SalesOrg), generate TDM wise summaries
            if (filterData.RSM && !filterData.SalesOrg) {
                const tdmGroups = that._groupByTDM(data);
                
                tdmGroups.forEach(tdmGroup => {
                    doc.addPage();
                    that._generateTDMAggregatedSummary(doc, tdmGroup);
                });
            }

            // Add final aggregated summary page
            doc.addPage();
            that._generateAggregatedSummary(doc, data);

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
        _generateTDMAggregatedSummary: function (doc, tdmGroup) {
            const pageWidth = doc.internal.pageSize.width;
            const margin = 8;
            let yPos = 14;

            const psrs = tdmGroup.PSRs;
            if (!psrs.length) return;

            const tdmName = tdmGroup.TDMName;
            const totalDays = Number(psrs[0]?.TotalDaysInMonth_F ?? 0);
            const daysPassed = Number(psrs[0]?.DaysPassed_F ?? 0);
            const daysPercent = totalDays ? ((daysPassed / totalDays) * 100).toFixed(1) : "0.0";

            // ===== TITLE =====
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("TDM Aggregated Summary", pageWidth / 2, yPos, { align: "center" });
            yPos += 8;

            doc.setFontSize(12);
            doc.text(`TDM: ${tdmName}`, pageWidth / 2, yPos, { align: "center" });
            yPos += 8;

            // ===== AGGREGATED TOTALS =====
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`Working Days: ${totalDays} | Days Passed: ${daysPassed} (${daysPercent}%)`, margin, yPos);
            doc.text(`Total PSRs: ${psrs.length}`, pageWidth - margin, yPos, { align: "right" });
            yPos += 8;

            // ===== VISITS SUMMARY =====
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("Visits Summary", margin, yPos);
            yPos += 4;

            const aggVisits = {
                plannedOutlets: sumArr(psrs.map(p => p.PlannedOutlets)),
                completedOutlets: sumArr(psrs.map(p => p.CompletedOutlets)),
                productiveOutlets: sumArr(psrs.map(p => p.ProductiveOutlets)),
                unproductiveOutlets: sumArr(psrs.map(p => p.UnproductiveOutlets)),
                unplannedOutlets: sumArr(psrs.map(p => p.UnplannedOutlets)),
                mtdTargetin250ml: sumArr(psrs.map(p => p.MTDTargetin250ml)),
                mtdSalein250ml: sumArr(psrs.map(p => p.MTDSalein250ml))
            };

            const targetAch = pct(aggVisits.mtdSalein250ml, aggVisits.mtdTargetin250ml, 2);
            const callCompletion = pct(aggVisits.completedOutlets, aggVisits.plannedOutlets, 2);
            const strikeRate = pct(aggVisits.productiveOutlets, aggVisits.plannedOutlets, 2);

            const visitSummaryRows = [
                ["Month Target Achievement", targetAch],
                ["Planned Outlets", aggVisits.plannedOutlets],
                ["Completed Outlets", aggVisits.completedOutlets],
                ["Call Completion %", callCompletion],
                ["Productive Outlets", aggVisits.productiveOutlets],
                ["Strike Rate %", strikeRate],
                ["Unproductive Outlets", aggVisits.unproductiveOutlets],
                ["Unplanned Outlets", aggVisits.unplannedOutlets]
            ];

            doc.autoTable({
                startY: yPos,
                body: visitSummaryRows,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 0.8 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 70 },
                    1: { halign: 'center', cellWidth: 40 }
                }
            });

            yPos = doc.lastAutoTable.finalY + 6;

            // ===== ORDER SUMMARY =====
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("Order Summary", margin, yPos);
            yPos += 4;

            const aggOrders = {
                ftdOrderQty: sumArr(psrs.map(p => p.FTDOrderQty)),
                ftdOrderSkus: sumArr(psrs.map(p => p.FTDOrderSkusUnq)),
                ftdSaleOrders: sumArr(psrs.map(p => p.FTDSaleOrders)),
                mtdOrderQty: sumArr(psrs.map(p => p.MTDOrderQty)),
                mtdOrderSkus: sumArr(psrs.map(p => p.MTDOrderSkusUnq)),
                mtdSaleOrders: sumArr(psrs.map(p => p.MTDSaleOrders))
            };

            const orderSummaryRows = [
                ["FTD Order Qty", aggOrders.ftdOrderQty.toFixed(0)],
                //["FTD SKUs", aggOrders.ftdOrderSkus],
                ["FTD Drop Size", div(aggOrders.ftdOrderQty, aggOrders.ftdSaleOrders, 1)],
                ["MTD Order Qty", aggOrders.mtdOrderQty.toFixed(0)],
                //["MTD SKUs", aggOrders.mtdOrderSkus],
                ["MTD Drop Size", div(aggOrders.mtdOrderQty, aggOrders.mtdSaleOrders, 1)]
            ];

            doc.autoTable({
                startY: yPos,
                body: orderSummaryRows,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 0.8 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 70 },
                    1: { halign: 'center', cellWidth: 40 }
                }
            });

            yPos = doc.lastAutoTable.finalY + 6;

            // ===== SALE SUMMARY =====
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("Sale Summary", margin, yPos);
            yPos += 4;

            const aggSales = {
                ftdSalePhysical: sumArr(psrs.map(p => p.FTDSalePhysical)),
                ftdSalein250ml: sumArr(psrs.map(p => p.FTDSalein250ml)),
                mtdSalePhysical: sumArr(psrs.map(p => p.MTDSalePhysical)),
                mtdSalein250ml: sumArr(psrs.map(p => p.MTDSalein250ml)),
                mtdTargetin250ml: sumArr(psrs.map(p => p.MTDTargetin250ml))
            };

            const avgBomPerDay = totalDays ? (aggSales.mtdTargetin250ml / totalDays).toFixed(1) : "0.0";

            const saleSummaryRows = [
                ["FTD Sale (Physical)", aggSales.ftdSalePhysical.toFixed(0)],
                ["FTD Sale (250ml)", aggSales.ftdSalein250ml.toFixed(0)],
                ["MTD Sale (Physical)", aggSales.mtdSalePhysical.toFixed(0)],
                ["MTD Sale (250ml)", aggSales.mtdSalein250ml.toFixed(0)],
                ["MTD Target (250ml)", aggSales.mtdTargetin250ml.toFixed(0)],
                ["Target Achievement %", pct(aggSales.mtdSalein250ml, aggSales.mtdTargetin250ml, 2)],
                ["BOM / Per Day Required", avgBomPerDay]
            ];

            doc.autoTable({
                startY: yPos,
                body: saleSummaryRows,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 0.8 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 70 },
                    1: { halign: 'center', cellWidth: 40 }
                }
            });

            yPos = doc.lastAutoTable.finalY + 6;

            // Check if new page needed
            if (yPos > 220) {
                doc.addPage();
                yPos = 14;
            }

            // ===== BRAND VOLUME SUMMARY =====
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("Volume Summary", margin, yPos);
            yPos += 4;

            const aggVolumes = {
                CSD: sumArr(psrs.map(p => p.CSDVol)),
                SSRB: sumArr(psrs.map(p => p.SSRBVol)),
                Slice: sumArr(psrs.map(p => p.SliceVol)),
                Sting: sumArr(psrs.map(p => p.StingVol)),
                Aqf: sumArr(psrs.map(p => p.AqfVol)),
                Gat: sumArr(psrs.map(p => p.GatVol)),
                ZS: sumArr(psrs.map(p => p.ZSVol)),
                Pepsi: sumArr(psrs.map(p => p.PepsiVol)),
                Dew: sumArr(psrs.map(p => p.DewVol)),
                Sevup: sumArr(psrs.map(p => p.SevupVol)),
                Mir: sumArr(psrs.map(p => p.MirVol)),
                SSCSD: sumArr(psrs.map(p => p.SSCSDVol)),
                MSCSD: sumArr(psrs.map(p => p.MSCSDVol)),
            };

             const TotVolumes = {
                CSD: sumArr(psrs.map(p => p.CSDVol)),
                SSRB: sumArr(psrs.map(p => p.SSRBVol)),
                Slice: sumArr(psrs.map(p => p.SliceVol)),
                Sting: sumArr(psrs.map(p => p.StingVol)),
                Aqf: sumArr(psrs.map(p => p.AqfVol)),
                Gat: sumArr(psrs.map(p => p.GatVol)),
                ZS: sumArr(psrs.map(p => p.ZSVol)),
             };

            const totalVolume = Object.values(TotVolumes).reduce((a, b) => a + b, 0); 

            const volumeSummaryRows = [
                ["CSD", aggVolumes.CSD.toFixed(0), pct(aggVolumes.CSD, aggOrders.ftdOrderQty, 1)],
                ["SSRB", aggVolumes.SSRB.toFixed(0), pct(aggVolumes.SSRB, aggOrders.ftdOrderQty, 1)],
                ["Slice", aggVolumes.Slice.toFixed(0), pct(aggVolumes.Slice, aggOrders.ftdOrderQty, 1)],
                ["Sting", aggVolumes.Sting.toFixed(0), pct(aggVolumes.Sting, aggOrders.ftdOrderQty, 1)],
                ["Aquafina", aggVolumes.Aqf.toFixed(0), pct(aggVolumes.Aqf, aggOrders.ftdOrderQty, 1)],
                ["Gatorade", aggVolumes.Gat.toFixed(0), pct(aggVolumes.Gat, aggOrders.ftdOrderQty, 1)],
                ["ZS", aggVolumes.ZS.toFixed(0), pct(aggVolumes.ZS, aggOrders.ftdOrderQty, 1)],
                ["Pepsi", aggVolumes.Pepsi.toFixed(0), pct(aggVolumes.Pepsi, aggOrders.ftdOrderQty, 1)],
                ["M.Dew", aggVolumes.Dew.toFixed(0), pct(aggVolumes.Dew, aggOrders.ftdOrderQty, 1)],
                ["7up", aggVolumes.Sevup.toFixed(0), pct(aggVolumes.Sevup, aggOrders.ftdOrderQty, 1)],
                ["Mirinda", aggVolumes.Mir.toFixed(0), pct(aggVolumes.Mir, aggOrders.ftdOrderQty, 1)],
                ["SSCSD", aggVolumes.SSCSD.toFixed(0), pct(aggVolumes.SSCSD, aggOrders.ftdOrderQty, 1)],
                ["MSCSD", aggVolumes.MSCSD.toFixed(0), pct(aggVolumes.MSCSD, aggOrders.ftdOrderQty, 1)],
            ];

            doc.autoTable({
                startY: yPos,
                head: [["Brand", "Volume", "%"]],
                body: volumeSummaryRows,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 0.8, halign: 'center' },
                headStyles: {
                    fillColor: [13, 71, 161],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },
                columnStyles: {
                    0: { fontStyle: 'bold', halign: 'left' }
                }
            });
        },
        _generateSalesOrgAggregatedSummary: function (doc, salesOrgGroup) {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 8;
    let yPos = 14;

    const psrs = salesOrgGroup.PSRs;
    if (!psrs.length) return;

    const salesOrgName = salesOrgGroup.SalesOrg;
    const totalDays = Number(psrs[0]?.TotalDaysInMonth_F ?? 0);
    const daysPassed = Number(psrs[0]?.DaysPassed_F ?? 0);
    const daysPercent = totalDays ? ((daysPassed / totalDays) * 100).toFixed(1) : "0.0";

    // ===== TITLE =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Sales Organization Aggregated Summary", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    doc.setFontSize(12);
    doc.text(`Sales Org: ${salesOrgName}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    // ===== AGGREGATED TOTALS =====
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Working Days: ${totalDays} | Days Passed: ${daysPassed} (${daysPercent}%)`, margin, yPos);
    doc.text(`Total PSRs: ${psrs.length}`, pageWidth - margin, yPos, { align: "right" });
    yPos += 8;

    // ===== VISITS SUMMARY =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Visits Summary", margin, yPos);
    yPos += 4;

    const aggVisits = {
        plannedOutlets: sumArr(psrs.map(p => p.PlannedOutlets)),
        completedOutlets: sumArr(psrs.map(p => p.CompletedOutlets)),
        productiveOutlets: sumArr(psrs.map(p => p.ProductiveOutlets)),
        unproductiveOutlets: sumArr(psrs.map(p => p.UnproductiveOutlets)),
        unplannedOutlets: sumArr(psrs.map(p => p.UnplannedOutlets)),
        mtdTargetin250ml: sumArr(psrs.map(p => p.MTDTargetin250ml)),
        mtdSalein250ml: sumArr(psrs.map(p => p.MTDSalein250ml))
    };

    const targetAch = pct(aggVisits.mtdSalein250ml, aggVisits.mtdTargetin250ml, 2);
    const callCompletion = pct(aggVisits.completedOutlets, aggVisits.plannedOutlets, 2);
    const strikeRate = pct(aggVisits.productiveOutlets, aggVisits.plannedOutlets, 2);

    const visitSummaryRows = [
        ["Month Target Achievement", targetAch],
        ["Planned Outlets", aggVisits.plannedOutlets],
        ["Completed Outlets", aggVisits.completedOutlets],
        ["Call Completion %", callCompletion],
        ["Productive Outlets", aggVisits.productiveOutlets],
        ["Strike Rate %", strikeRate],
        ["Unproductive Outlets", aggVisits.unproductiveOutlets],
        ["Unplanned Outlets", aggVisits.unplannedOutlets]
    ];

    doc.autoTable({
        startY: yPos,
        body: visitSummaryRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 0.8 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 70 },
            1: { halign: 'center', cellWidth: 40 }
        }
    });

    yPos = doc.lastAutoTable.finalY + 6;

    // ===== ORDER SUMMARY =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Order Summary", margin, yPos);
    yPos += 4;

    const aggOrders = {
        ftdOrderQty: sumArr(psrs.map(p => p.FTDOrderQty)),
        ftdOrderSkus: sumArr(psrs.map(p => p.FTDOrderSkusUnq)),
        ftdSaleOrders: sumArr(psrs.map(p => p.FTDSaleOrders)),
        mtdOrderQty: sumArr(psrs.map(p => p.MTDOrderQty)),
        mtdOrderSkus: sumArr(psrs.map(p => p.MTDOrderSkusUnq)),
        mtdSaleOrders: sumArr(psrs.map(p => p.MTDSaleOrders))
    };

    const orderSummaryRows = [
        ["FTD Order Qty", aggOrders.ftdOrderQty.toFixed(0)],
        ["FTD Drop Size", div(aggOrders.ftdOrderQty, aggOrders.ftdSaleOrders, 1)],
        ["MTD Order Qty", aggOrders.mtdOrderQty.toFixed(0)],
        ["MTD Drop Size", div(aggOrders.mtdOrderQty, aggOrders.mtdSaleOrders, 1)]
    ];

    doc.autoTable({
        startY: yPos,
        body: orderSummaryRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 0.8 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 70 },
            1: { halign: 'center', cellWidth: 40 }
        }
    });

    yPos = doc.lastAutoTable.finalY + 6;

    // ===== SALE SUMMARY =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Sale Summary", margin, yPos);
    yPos += 4;

    const aggSales = {
        ftdSalePhysical: sumArr(psrs.map(p => p.FTDSalePhysical)),
        ftdSalein250ml: sumArr(psrs.map(p => p.FTDSalein250ml)),
        mtdSalePhysical: sumArr(psrs.map(p => p.MTDSalePhysical)),
        mtdSalein250ml: sumArr(psrs.map(p => p.MTDSalein250ml)),
        mtdTargetin250ml: sumArr(psrs.map(p => p.MTDTargetin250ml))
    };

    const avgBomPerDay = totalDays ? (aggSales.mtdTargetin250ml / totalDays).toFixed(1) : "0.0";

    const saleSummaryRows = [
        ["FTD Sale (Physical)", aggSales.ftdSalePhysical.toFixed(0)],
        ["FTD Sale (250ml)", aggSales.ftdSalein250ml.toFixed(0)],
        ["MTD Sale (Physical)", aggSales.mtdSalePhysical.toFixed(0)],
        ["MTD Sale (250ml)", aggSales.mtdSalein250ml.toFixed(0)],
        ["MTD Target (250ml)", aggSales.mtdTargetin250ml.toFixed(0)],
        ["Target Achievement %", pct(aggSales.mtdSalein250ml, aggSales.mtdTargetin250ml, 2)],
        ["BOM / Per Day Required", avgBomPerDay]
    ];

    doc.autoTable({
        startY: yPos,
        body: saleSummaryRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 0.8 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 70 },
            1: { halign: 'center', cellWidth: 40 }
        }
    });

    yPos = doc.lastAutoTable.finalY + 6;

    // Check if new page needed
    if (yPos > 220) {
        doc.addPage();
        yPos = 14;
    }

    // ===== BRAND VOLUME SUMMARY =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Volume Summary", margin, yPos);
    yPos += 4;

    const aggVolumes = {
        CSD: sumArr(psrs.map(p => p.CSDVol)),
        SSRB: sumArr(psrs.map(p => p.SSRBVol)),
        Slice: sumArr(psrs.map(p => p.SliceVol)),
        Sting: sumArr(psrs.map(p => p.StingVol)),
        Aqf: sumArr(psrs.map(p => p.AqfVol)),
        Gat: sumArr(psrs.map(p => p.GatVol)),
        ZS: sumArr(psrs.map(p => p.ZSVol)),
        Pepsi: sumArr(psrs.map(p => p.PepsiVol)),
        Dew: sumArr(psrs.map(p => p.DewVol)),
        Sevup: sumArr(psrs.map(p => p.SevupVol)),
        Mir: sumArr(psrs.map(p => p.MirVol)),
        SSCSD: sumArr(psrs.map(p => p.SSCSDVol)),
        MSCSD: sumArr(psrs.map(p => p.MSCSDVol)),
    };

    const volumeSummaryRows = [
        ["CSD", aggVolumes.CSD.toFixed(0), pct(aggVolumes.CSD, aggOrders.ftdOrderQty, 1)],
        ["SSRB", aggVolumes.SSRB.toFixed(0), pct(aggVolumes.SSRB, aggOrders.ftdOrderQty, 1)],
        ["Slice", aggVolumes.Slice.toFixed(0), pct(aggVolumes.Slice, aggOrders.ftdOrderQty, 1)],
        ["Sting", aggVolumes.Sting.toFixed(0), pct(aggVolumes.Sting, aggOrders.ftdOrderQty, 1)],
        ["Aquafina", aggVolumes.Aqf.toFixed(0), pct(aggVolumes.Aqf, aggOrders.ftdOrderQty, 1)],
        ["Gatorade", aggVolumes.Gat.toFixed(0), pct(aggVolumes.Gat, aggOrders.ftdOrderQty, 1)],
        ["ZS", aggVolumes.ZS.toFixed(0), pct(aggVolumes.ZS, aggOrders.ftdOrderQty, 1)],
        ["Pepsi", aggVolumes.Pepsi.toFixed(0), pct(aggVolumes.Pepsi, aggOrders.ftdOrderQty, 1)],
        ["M.Dew", aggVolumes.Dew.toFixed(0), pct(aggVolumes.Dew, aggOrders.ftdOrderQty, 1)],
        ["7up", aggVolumes.Sevup.toFixed(0), pct(aggVolumes.Sevup, aggOrders.ftdOrderQty, 1)],
        ["Mirinda", aggVolumes.Mir.toFixed(0), pct(aggVolumes.Mir, aggOrders.ftdOrderQty, 1)],
        ["SSCSD", aggVolumes.SSCSD.toFixed(0), pct(aggVolumes.SSCSD, aggOrders.ftdOrderQty, 1)],
        ["MSCSD", aggVolumes.MSCSD.toFixed(0), pct(aggVolumes.MSCSD, aggOrders.ftdOrderQty, 1)],
    ];

    doc.autoTable({
        startY: yPos,
        head: [["Brand", "Volume", "%"]],
        body: volumeSummaryRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 0.8, halign: 'center' },
        headStyles: {
            fillColor: [13, 71, 161],
            textColor: [255, 255, 255],
            fontStyle: "bold"
        },
        columnStyles: {
            0: { fontStyle: 'bold', halign: 'left' }
        }
    });
},
     
// ye wala function final summary page k liye hai and ise change krna hai as per new requirements..
//         _generateAggregatedSummary: function (doc, adrDataArray) {
//             const pageWidth = doc.internal.pageSize.width;
//             const margin = 8;
//             let yPos = 14;

//             // Aggregate all PSRs from all ADRs
//             const allPSRs = [];
//             adrDataArray.forEach(adr => {
//                 allPSRs.push(...adr.PSRs);
//             });

//             if (!allPSRs.length) return;

//             // Get filter context
//             const oFilterModel = this.getView().getModel("filterModel");
//             const filterData = oFilterModel.getData();
            
//             let summaryLevel = "Overall";
//             let summaryValue = "";
            
//             if (filterData.ADR) {
//                 summaryLevel = "ADR";
//                 summaryValue = filterData.ADR;
//             } else if (filterData.TDM) {
//                 summaryLevel = "TDM";
//                 summaryValue = filterData.TDM;
//             } else if (filterData.SalesOrg) {
//                 summaryLevel = "Sales Organization";
//                 summaryValue = filterData.SalesOrg;
//             } else if (filterData.RSM) {
//                 summaryLevel = "RSM";
//                 summaryValue = filterData.RSM;
// }

//             // ===== TITLE =====
//             doc.setFont("helvetica", "bold");
//             doc.setFontSize(16);
//             doc.text(`${summaryLevel} Aggregated Summary`, pageWidth / 2, yPos, { align: "center" });
//             yPos += 8;

//             if (summaryValue) {
//                 doc.setFontSize(12);
//                 doc.text(`${summaryLevel}: ${summaryValue}`, pageWidth / 2, yPos, { align: "center" });
//                 yPos += 8;
//             }

//             // ===== AGGREGATED TOTALS =====
//             const totalDays = Number(allPSRs[0]?.TotalDaysInMonth_F ?? 0);
//             const daysPassed = Number(allPSRs[0]?.DaysPassed_F ?? 0);
//             const daysPercent = totalDays ? ((daysPassed / totalDays) * 100).toFixed(1) : "0.0";

//             doc.setFontSize(10);
//             doc.setFont("helvetica", "bold");
//             doc.text(`Working Days: ${totalDays} | Days Passed: ${daysPassed} (${daysPercent}%)`, margin, yPos);
//             doc.text(`Total PSRs: ${allPSRs.length}`, pageWidth - margin, yPos, { align: "right" });
//             yPos += 8;

//             // ===== VISITS SUMMARY =====
//             doc.setFont("helvetica", "bold");
//             doc.setFontSize(11);
//             doc.text("Visits Summary", margin, yPos);
//             yPos += 4;

//             const aggVisits = {
//                 plannedOutlets: sumArr(allPSRs.map(p => p.PlannedOutlets)),
//                 completedOutlets: sumArr(allPSRs.map(p => p.CompletedOutlets)),
//                 productiveOutlets: sumArr(allPSRs.map(p => p.ProductiveOutlets)),
//                 unproductiveOutlets: sumArr(allPSRs.map(p => p.UnproductiveOutlets)),
//                 unplannedOutlets: sumArr(allPSRs.map(p => p.UnplannedOutlets)),
//                 mtdTargetin250ml: sumArr(allPSRs.map(p => p.MTDTargetin250ml)),
//                 mtdSalein250ml: sumArr(allPSRs.map(p => p.MTDSalein250ml))
//             };

//             const targetAch = pct(aggVisits.mtdSalein250ml, aggVisits.mtdTargetin250ml, 2);
//             const callCompletion = pct(aggVisits.completedOutlets, aggVisits.plannedOutlets, 2);
//             const strikeRate = pct(aggVisits.productiveOutlets, aggVisits.plannedOutlets, 2);

//             const visitSummaryRows = [
//                 ["Month Target Achievement", targetAch],
//                 ["Planned Outlets", aggVisits.plannedOutlets],
//                 ["Completed Outlets", aggVisits.completedOutlets],
//                 ["Call Completion %", callCompletion],
//                 ["Productive Outlets", aggVisits.productiveOutlets],
//                 ["Strike Rate %", strikeRate],
//                 ["Unproductive Outlets", aggVisits.unproductiveOutlets],
//                 ["Unplanned Outlets", aggVisits.unplannedOutlets]
//             ];

//             doc.autoTable({
//                 startY: yPos,
//                 body: visitSummaryRows,
//                 theme: 'grid',
//                 styles: { fontSize: 8, cellPadding: 0.8 },
//                 columnStyles: {
//                     0: { fontStyle: 'bold', cellWidth: 70 },
//                     1: { halign: 'center', cellWidth: 40 }
//                 }
//             });

//             yPos = doc.lastAutoTable.finalY + 6;

//             // ===== ORDER SUMMARY =====
//             doc.setFont("helvetica", "bold");
//             doc.setFontSize(11);
//             doc.text("Order Summary", margin, yPos);
//             yPos += 4;

//             const aggOrders = {
//                 ftdOrderQty: sumArr(allPSRs.map(p => p.FTDOrderQty)),
//                 ftdOrderSkus: sumArr(allPSRs.map(p => p.FTDOrderSkusUnq)),
//                 ftdSaleOrders: sumArr(allPSRs.map(p => p.FTDSaleOrders)),
//                 mtdOrderQty: sumArr(allPSRs.map(p => p.MTDOrderQty)),
//                 mtdOrderSkus: sumArr(allPSRs.map(p => p.MTDOrderSkusUnq)),
//                 mtdSaleOrders: sumArr(allPSRs.map(p => p.MTDSaleOrders))
//             };

//            const orderSummaryRows = [
//                 ["FTD Order Qty", aggOrders.ftdOrderQty.toFixed(0)],
//                 //["FTD SKUs", aggOrders.ftdOrderSkus],
//                 ["FTD Drop Size", div(aggOrders.ftdOrderQty, aggOrders.ftdSaleOrders, 1)],
//                 ["MTD Order Qty", aggOrders.mtdOrderQty.toFixed(0)],
//                 //["MTD SKUs", aggOrders.mtdOrderSkus],
//                 ["MTD Drop Size", div(aggOrders.mtdOrderQty, aggOrders.mtdSaleOrders, 1)]
//             ];

//             doc.autoTable({
//                 startY: yPos,
//                 body: orderSummaryRows,
//                 theme: 'grid',
//                 styles: { fontSize: 8, cellPadding: 0.8 },
//                 columnStyles: {
//                     0: { fontStyle: 'bold', cellWidth: 70 },
//                     1: { halign: 'center', cellWidth: 40 }
//                 }
//             });

//             yPos = doc.lastAutoTable.finalY + 6;

//             // ===== SALE SUMMARY =====
//             doc.setFont("helvetica", "bold");
//            doc.setFontSize(11);
//             doc.text("Sale Summary", margin, yPos);
//             yPos += 4;

//             const aggSales = {
//                 ftdSalePhysical: sumArr(allPSRs.map(p => p.FTDSalePhysical)),
//                 ftdSalein250ml: sumArr(allPSRs.map(p => p.FTDSalein250ml)),
//                 mtdSalePhysical: sumArr(allPSRs.map(p => p.MTDSalePhysical)),
//                 mtdSalein250ml: sumArr(allPSRs.map(p => p.MTDSalein250ml)),
//                 mtdTargetin250ml: sumArr(allPSRs.map(p => p.MTDTargetin250ml))
//             };

//             const avgBomPerDay = totalDays ? (aggSales.mtdTargetin250ml / totalDays).toFixed(1) : "0.0";

//             const saleSummaryRows = [
//                 ["FTD Sale (Physical)", aggSales.ftdSalePhysical.toFixed(0)],
//                 ["FTD Sale (250ml)", aggSales.ftdSalein250ml.toFixed(0)],
//                 ["MTD Sale (Physical)", aggSales.mtdSalePhysical.toFixed(0)],
//                 ["MTD Sale (250ml)", aggSales.mtdSalein250ml.toFixed(0)],
//                 ["MTD Target (250ml)", aggSales.mtdTargetin250ml.toFixed(0)],
//                 ["Target Achievement %", pct(aggSales.mtdSalein250ml, aggSales.mtdTargetin250ml, 2)],
//                 ["BOM / Per Day Required", avgBomPerDay]
//             ];

//             doc.autoTable({
//                 startY: yPos,
//                 body: saleSummaryRows,
//                 theme: 'grid',
//                 styles: { fontSize: 8, cellPadding: 0.8 },
//                 columnStyles: {
//                     0: { fontStyle: 'bold', cellWidth: 70 },
//                     1: { halign: 'center', cellWidth: 40 }
//                 }
//             });

//             yPos = doc.lastAutoTable.finalY + 6;

//             // Check if new page needed
//             if (yPos > 220) {
//                 doc.addPage();
//                 yPos = 14;
//             }

//             // ===== BRAND VOLUME SUMMARY =====
//             doc.setFont("helvetica", "bold");
//             doc.setFontSize(11);
//             doc.text("Volume Summary", margin, yPos);
//             yPos += 4;

//             const aggVolumes = {
//                 CSD: sumArr(allPSRs.map(p => p.CSDVol)),
//                 SSRB: sumArr(allPSRs.map(p => p.SSRBVol)),
//                 Slice: sumArr(allPSRs.map(p => p.SliceVol)),
//                 Sting: sumArr(allPSRs.map(p => p.StingVol)),
//                 Aqf: sumArr(allPSRs.map(p => p.AqfVol)),
//                 Gat: sumArr(allPSRs.map(p => p.GatVol)),
//                 ZS: sumArr(allPSRs.map(p => p.ZSVol)),
//                 Pepsi: sumArr(allPSRs.map(p => p.PepsiVol)),
//                 Dew: sumArr(allPSRs.map(p => p.DewVol)),
//                 Sevup: sumArr(allPSRs.map(p => p.SevupVol)),
//                 Mir: sumArr(allPSRs.map(p => p.MirVol)),
//                 SSCSD: sumArr(allPSRs.map(p => p.SSCSDVol)),
//                 MSCSD: sumArr(allPSRs.map(p => p.MSCSDVol)),

                
//             };

//             const totalVolume = Object.values(aggVolumes).reduce((a, b) => a + b, 0);

//             const volumeSummaryRows = [
//                 ["CSD", aggVolumes.CSD.toFixed(0), pct(aggVolumes.CSD, aggOrders.ftdOrderQty, 1)],
//                 ["SSRB", aggVolumes.SSRB.toFixed(0), pct(aggVolumes.SSRB, aggOrders.ftdOrderQty, 1)],
//                 ["Slice", aggVolumes.Slice.toFixed(0), pct(aggVolumes.Slice, aggOrders.ftdOrderQty, 1)],
//                 ["Sting", aggVolumes.Sting.toFixed(0), pct(aggVolumes.Sting, aggOrders.ftdOrderQty, 1)],
//                 ["Aquafina", aggVolumes.Aqf.toFixed(0), pct(aggVolumes.Aqf, aggOrders.ftdOrderQty, 1)],
//                 ["Gatorade", aggVolumes.Gat.toFixed(0), pct(aggVolumes.Gat, aggOrders.ftdOrderQty, 1)],
//                 ["ZS", aggVolumes.ZS.toFixed(0), pct(aggVolumes.ZS, aggOrders.ftdOrderQty, 1)],
//                 ["Pepsi", aggVolumes.Pepsi.toFixed(0), pct(aggVolumes.Pepsi, aggOrders.ftdOrderQty, 1)],
//                 ["M.Dew", aggVolumes.Dew.toFixed(0), pct(aggVolumes.Dew, aggOrders.ftdOrderQty, 1)],
//                 ["7up", aggVolumes.Sevup.toFixed(0), pct(aggVolumes.Sevup, aggOrders.ftdOrderQty, 1)],
//                 ["Mirinda", aggVolumes.Mir.toFixed(0), pct(aggVolumes.Mir, aggOrders.ftdOrderQty, 1)],
//                 ["SSCSD", aggVolumes.SSCSD.toFixed(0), pct(aggVolumes.SSCSD, aggOrders.ftdOrderQty, 1)],
//                 ["MSCSD", aggVolumes.MSCSD.toFixed(0), pct(aggVolumes.MSCSD, aggOrders.ftdOrderQty, 1)]
//             ];

//             doc.autoTable({
//                 startY: yPos,
//                 head: [["Brand", "Volume", "%"]],
//                 body: volumeSummaryRows,
//                 theme: 'grid',
//                 styles: { fontSize: 8, cellPadding: 0.8, halign: 'center' },
//                 headStyles: {
//                     fillColor: [13, 71, 161],
//                     textColor: [255, 255, 255],
//                     fontStyle: "bold"
//                 },
//                 columnStyles: {
//                     0: { fontStyle: 'bold', halign: 'left' }
//                 }
//             });
//         },
                    _generateAggregatedSummary: function (doc, adrDataArray) {
                const pageWidth = doc.internal.pageSize.width;
                const pageHeight = doc.internal.pageSize.height;
                const margin = 8;
                let yPos = 8;

                
                const TABLE_STYLES = {
                    fontSize: 6,
                    halign: 'center',
                    cellPadding: 0.5,
                    textColor: [0, 0, 0]
                };

                const HEAD_STYLES = {
                    fillColor: [60, 120, 180],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 6
                };

                // ===== AGGREGATE PSRs =====
                const allPSRs = [];
                adrDataArray.forEach(adr => allPSRs.push(...(adr.PSRs || [])));
                if (!allPSRs.length) return;

                // ===== FILTER CONTEXT =====
                const filterData = this.getView().getModel("filterModel").getData();
                let summaryLevel = "Overall", summaryValue = "";

                if (filterData.ADR) { summaryLevel = "ADR"; summaryValue = filterData.ADR; }
                else if (filterData.TDM) { summaryLevel = "TDM"; summaryValue = filterData.TDM; }
                else if (filterData.SalesOrg) { summaryLevel = "Sales Organization"; summaryValue = filterData.SalesOrg; }
                else if (filterData.RSM) { summaryLevel = "RSM"; summaryValue = filterData.RSM; }

                // ===== TITLE =====
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text(`${summaryLevel}  Summary`, pageWidth / 2, yPos, { align: 'center' });
                yPos += 6;

                if (summaryValue) {
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'normal');
                    doc.text(`${summaryLevel}: ${summaryValue}`, pageWidth / 2, yPos, { align: 'center' });
                    yPos += 6;
                }

                // ===== TOP 3 BLOCKS (SAME ROW) =====
                const leftY = yPos;
                const midX = margin + 60;
                const rightX = midX + 58;

                const totalDays = +allPSRs[0]?.TotalDaysInMonth_F || 0;
                const daysPassed = +allPSRs[0]?.DaysPassed_F || 0;
                const daysPct = totalDays ? ((daysPassed / totalDays) * 100).toFixed(1) + "%" : "0%";
                const totalMTDTarget = sumArr(allPSRs.map(p => p.MTDTargetin250ml));
                const totalMTDSale = sumArr(allPSRs.map(p => p.MTDSalein250ml));
                const monthTargetAch = pct(totalMTDSale, totalMTDTarget);
               // const monthtargetAch = +allPSRs[0]?.mtdSaleData && allPSRs[0]?.mtdSaleData.trg && allPSRs[0]?.mtdSaleData.FTDSalein250ml
                 //           ? ((allPSRs[0]?.mtdSaleData.FTDSalein250ml / allPSRs[0]?.mtdSaleData.trg) * 100).toFixed(1) + "%" : "0%";    

                doc.autoTable({
                    startY: leftY,
                    body: [
                        ["Total PSRs", allPSRs.length],
                        ["Working Days", totalDays],
                        ["Days Passed", daysPassed],
                        ["Days Passed %", daysPct],
                        ["Month Target Achievement %", monthTargetAch]

                    ],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    margin: { left: margin },
                    tableWidth: 55,
                    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } }
                });

                const aggVisits = {
                    planned: sumArr(allPSRs.map(p => p.PlannedOutlets)),
                    completed: sumArr(allPSRs.map(p => p.CompletedOutlets)),
                    productive: sumArr(allPSRs.map(p => p.ProductiveOutlets)),
                    unproductive: sumArr(allPSRs.map(p => p.UnproductiveOutlets)),
                    unplanned: sumArr(allPSRs.map(p => p.UnplannedOutlets))
                };

                doc.autoTable({
                    startY: leftY,
                    body: [
                        ["Planned", aggVisits.planned],
                        ["Completed", aggVisits.completed],
                        ["Not Completed", aggVisits.planned - aggVisits.completed],
                        ["Unplanned", aggVisits.unplanned],
                        ["Productive", aggVisits.productive],
                        ["UnProd", aggVisits.unproductive],
                        ["Total Orders", aggVisits.productive + aggVisits.unplanned]
                    ],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    margin: { left: rightX },
                    tableWidth: 40,
                    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } }
                });

                yPos = Math.max(doc.lastAutoTable.finalY, leftY) + 6;

                // ===== Call Completion/Strike Rate =====
                doc.setFont(undefined, 'bold');
                doc.setFontSize(10);
                doc.text("Call Completion / Strike Rate", margin, yPos);
                yPos += 3;

                const completionPct = parseFloat((allPSRs[0]?.CompletedOutlets / allPSRs[0]?.PlannedOutlets_F * 100).toFixed(1));
                const MTDcompletionPct = parseFloat((allPSRs[0]?.MTDCompletedOutlets / allPSRs[0]?.MTD_PlannedCalls_F * 100).toFixed(1));
                const strikeRatePct = parseFloat((allPSRs[0]?.ProductiveOutlets_F / allPSRs[0]?.PlannedOutlets_F * 100).toFixed(1));
                const MTDstrikeRatePct = parseFloat((allPSRs[0]?.MTDProductiveOutlets_F / allPSRs[0]?.MTD_PlannedCalls_F * 100).toFixed(1));
                

                doc.autoTable({
                    startY: yPos,
                    head:  [["Type", "CC Total", "CC GPS", "CC %", "SR Total", "SR GPS", "SR %"]],
                    body: [
                        ["FTD",
                            sumArr(allPSRs.map(p => p.CompletedOutlets)) ,
                            sumArr(allPSRs.map(p => p.FTDCompletedCallsWithin50m)),
                            completionPct,
                            sumArr(allPSRs.map(p => p.ProductiveOutlets_F)) ,
                            sumArr(allPSRs.map(p => p.FTDStrikeRateWithin50m)),
                            strikeRatePct 
                        ],
                        ["MTD", 
                            sumArr(allPSRs.map(p => p.MTDCompletedOutlets)) ,
                            sumArr(allPSRs.map(p => p.MTDCompletedCallsWithin50m)),
                            MTDcompletionPct,
                            sumArr(allPSRs.map(p => p.MTDProductiveOutlets_F)) ,
                            sumArr(allPSRs.map(p => p.MTDStrikeRateWithin50m_F)),
                            MTDstrikeRatePct
                        ]
                    ],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    headStyles: HEAD_STYLES,
                    margin: { left: margin, right: margin },
                    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } }
                });

                yPos = doc.lastAutoTable.finalY + 5;

                // ===== ORDER SUMMARY =====
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text("Order", margin, yPos);
                yPos += 3;

                const aggOrders = {
                    ftdQty: sumArr(allPSRs.map(p => p.FTDOrderQty)),
                    ftdOrders: sumArr(allPSRs.map(p => p.FTDSaleOrders)),
                    mtdQty: sumArr(allPSRs.map(p => p.MTDOrderQty)),
                    mtdOrders: sumArr(allPSRs.map(p => p.MTDSaleOrders))
                };
                const skuperorder = allPSRs.map(p => p.FTDOrderSkus/ p.FTDSaleOrders);

                doc.autoTable({
                    startY: yPos,
                    head: [["Type", "Qty", "SKUs", "SKU/O" ,"Drop S"]],
                    body: [
                        ["FTD",
                            sumArr(allPSRs.map(p => p.FTDOrderQty)),
                             sumArr(allPSRs.map(p => p.FTDOrderSkusUnq)),
                             " ",
                             div(aggOrders.ftdQty, aggOrders.ftdOrders, 1)

                             
                        ],
                        ["MTD", 
                            sumArr(allPSRs.map(p => p.MTDOrderQty)), 
                            sumArr(allPSRs.map(p => p.MTDOrderSkusUnq)),
                            " ",
                            div(aggOrders.mtdQty, aggOrders.mtdOrders, 1)

                        ]
                    ],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    headStyles: HEAD_STYLES,
                    margin: { left: margin, right: margin },
                    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } }
                });

                yPos = doc.lastAutoTable.finalY + 5;

                // ===== SALE SUMMARY =====
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text("Sale", margin, yPos);
                yPos += 3;

                const aggSales = {
                    ftdPhy: sumArr(allPSRs.map(p => p.FTDSalePhysical)),
                    ftd250: sumArr(allPSRs.map(p => p.FTDSalein250ml)),
                    mtd250: sumArr(allPSRs.map(p => p.MTDSalein250ml)),
                    mtdTrg: sumArr(allPSRs.map(p => p.MTDTargetin250ml)),
                    ftOrders250: sumArr(allPSRs.map(p => p.FTDSaleOrders))
                };

                //const ftdBOM= parseFloat((((aggSales.mtdTrg - aggSales.mtd250) / (totalDays - daysPassed))- aggSales.ftd250).toFixed(1));
                const mtdBOM= parseFloat(((aggSales.mtdTrg - aggSales.mtd250) / (totalDays - daysPassed)).toFixed(1));
                const FTDDropSize =  div(aggSales.ftd250, aggOrders.ftdOrders, 1);
                const MTDDropSize =  div(aggSales.mtd250, aggOrders.mtdOrders, 1);


                doc.autoTable({
                    startY: yPos,
                    head: [["Type", "Actual (Phy)", "Actual (250ml)", "Month Target", "BOM/Day","SKU/I", "Drop S"]],
                    body: [
                        ["FTD",
                             aggSales.ftdPhy,
                            aggSales.ftd250, 
                            " ",
                            " ",
                            " ",
                            FTDDropSize
                        ],
                        ["MTD", 
                            sumArr(allPSRs.map(p => p.MTDSalePhysical)),
                            aggSales.mtd250, 
                            aggSales.mtdTrg,
                            mtdBOM,
                            " ",
                            MTDDropSize
                        ]
                    ],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    headStyles: HEAD_STYLES,
                    margin: { left: margin, right: margin },
                    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } }
                });

                yPos = doc.lastAutoTable.finalY + 5;
                // ===== Quantity Intervals =====
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text("Customer Quantity Intervals", margin, yPos);
                yPos += 3;

                const qty = {
                    qty1: sumArr(allPSRs.map(p => p.Qty1_F)),
                    qty2: sumArr(allPSRs.map(p => p.Qty2_F)),
                    qty3: sumArr(allPSRs.map(p => p.Qty3_F)),
                    qty45: sumArr(allPSRs.map(p => p.Qty4To5_F)),
                    qty610: sumArr(allPSRs.map(p => p.Qty6To10_F)),
                    qty1120: sumArr(allPSRs.map(p => p.Qty11To20_F)),
                    qty20: sumArr(allPSRs.map(p => p.QtyGT20))
                };

                doc.autoTable({
                    startY: yPos,
                    head: [[ "Qty=1", "Qty=2", "Qty=3", "Qty=4,5", "Qty=6-10", "Qty 11-20", "Qty>20"]],
                    body: [
                        [   qty.qty1, 
                            qty.qty2, 
                            qty.qty3,
                            qty.qty45,
                            qty.qty610, 
                            qty.qty1120,
                            qty.qty20
                        ]
                    ],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    headStyles: HEAD_STYLES,
                    margin: { left: margin, right: margin }
                });
                 yPos = doc.lastAutoTable.finalY + 5;
           
                 
                // // ===== Reason For No Call / No Order =====
                   
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text("Reason For No Call / No Order", margin, yPos);
                yPos += 3;

                doc.autoTable({
                    startY: yPos,
                    head: [["", " ", "No Call ", "  ", "  ",,
                            " ",
                            "No Order", " "," "," "],
                            ["Type", "No Time", "Area Inacc", "Outlet Close", "Over Stock", "No Owner", "No Fund", "Price Disp", "Buy WS", "Buy B Brand"]
                        ],
                    body: [
                        
                        ["FTD",
                            sumArr(allPSRs.map(p => p.FTDNoTime_F)),
                            sumArr(allPSRs.map(p => p.FTDAreaInacc_F)), 
                            sumArr(allPSRs.map(p => p.FTDOutletClose_F)),
                            sumArr(allPSRs.map(p => p.FTDOverStock_F)),
                            sumArr(allPSRs.map(p => p.FTDNoOwner_F)),
                            sumArr(allPSRs.map(p => p.FTDNoFund_F)),
                            sumArr(allPSRs.map(p => p.FTDPriceDisp_F)),
                            sumArr(allPSRs.map(p => p.FTDBuyWS_F)),
                            sumArr(allPSRs.map(p => p.FTDBuyBrand_F))
                        ],
                        ["MTD", 
                            sumArr(allPSRs.map(p => p.MTDNoTime_F)),
                            sumArr(allPSRs.map(p => p.MTDAreaInacc_F)), 
                            sumArr(allPSRs.map(p => p.MTDOutletClose_F)),
                            sumArr(allPSRs.map(p => p.MTDOverStock_F)),
                            sumArr(allPSRs.map(p => p.MTDNoOwner_F)),
                            sumArr(allPSRs.map(p => p.MTDNoFund_F)),
                            sumArr(allPSRs.map(p => p.MTDPriceDisparity_F)),
                            sumArr(allPSRs.map(p => p.MTDBuyWS_F)),
                            sumArr(allPSRs.map(p => p.MTDBuyBrand_F))
                        ]
                    ],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    headStyles: HEAD_STYLES,
                    margin: { left: margin, right: margin },
                    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } }
                  
                });

                yPos = doc.lastAutoTable.finalY + 5;
 
                 
                // ===== Reason For No Delivery=====
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text("Reason For No Delivery", margin, yPos);
                yPos += 3;

                doc.autoTable({
                    startY: yPos,
                    head: [["Type", "Stock Unavail", "Area Inacc", "Outlet Closed", "No Money", "No Order", "No Time", "No Empty"]],
                    body: [
                        ["FTD",
                            sumArr(allPSRs.map(p => p.FTDStockUnavail_F)),
                            sumArr(allPSRs.map(p => p.FTDAreaInAcc_ND_F)), 
                            sumArr(allPSRs.map(p => p.FTDOutletClosed_ND_F)),
                            sumArr(allPSRs.map(p => p.FTDNoMoney_ND_F)),
                            sumArr(allPSRs.map(p => p.FTDNoOrder_ND_F)),
                            sumArr(allPSRs.map(p => p.FTDNoTime_ND_F)),
                            sumArr(allPSRs.map(p => p.FTDNoEmpty_ND_F))
                        ],
                        ["MTD", 
                           sumArr(allPSRs.map(p => p.MTDStockUnavail_F)),
                            sumArr(allPSRs.map(p => p.MTDAreaInAcc_ND_F)), 
                            sumArr(allPSRs.map(p => p.MTDOutletClosed_ND_F)),
                            sumArr(allPSRs.map(p => p.MTDNoMoney_ND_F)),
                            sumArr(allPSRs.map(p => p.MTDNoOrder_ND_F)),
                            sumArr(allPSRs.map(p => p.MTDNoTime_ND_F)),
                            sumArr(allPSRs.map(p => p.MTDNoEmpty_ND_F))
                        ]
                    ],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    headStyles: HEAD_STYLES,
                    margin: { left: margin, right: margin },
                    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } }
                });

                yPos = doc.lastAutoTable.finalY + 5;

                // ===== Outlet Wise Info=====
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text("Outlet Wise Info (Counts)", margin, yPos);
                yPos += 3;

                doc.autoTable({
                    startY: yPos,
                    head: [["CSD", "SSRB", "Slice", "Sting", "Aquafina", "Gatorade", "Zero Sugar", "Pepsi", "M.Dew", "7up", "Mirinda", "SS CSD", "MS CSD"]],
                    body: [
                        [
                                sumArr(allPSRs.map(p => p.CSDOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.SSRBOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.SliceOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.StingOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.AqfOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.GatOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.ZSOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.PepsiOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.DewOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.SevupOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.MirOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.SSCSDOutletsCount_F)),
                                sumArr(allPSRs.map(p => p.MSCSDOutletsCount_F))
                            ]
                    ],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    headStyles: HEAD_STYLES,
                    margin: { left: margin, right: margin }
                    
                });

                yPos = doc.lastAutoTable.finalY + 2;

                // % INFO // 

                const totalFTDSaleOrders = sumArr(allPSRs.map(p => p.FTDSaleOrders));


                doc.autoTable({
                    startY: yPos,
                    head: [["CSD", "SSRB", "Slice", "Sting", "Aquafina", "Gatorade", "Zero Sugar", "Pepsi", "M.Dew", "7up", "Mirinda", "SS CSD", "MS CSD"]],
                    body: [
                       [
                        pct(
                            sumArr(allPSRs.map(p => p.CSDOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.SSRBOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.SliceOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                         pct(
                            sumArr(allPSRs.map(p => p.StingOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                         pct(
                            sumArr(allPSRs.map(p => p.AqfOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                         pct(
                            sumArr(allPSRs.map(p => p.GatOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                         pct(
                            sumArr(allPSRs.map(p => p.ZSOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                         pct(
                            sumArr(allPSRs.map(p => p.PepsiOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                         pct(
                            sumArr(allPSRs.map(p => p.DewOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.SevupOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                         pct(
                            sumArr(allPSRs.map(p => p.MirOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                         pct(
                            sumArr(allPSRs.map(p => p.SSCSDOutletsCount_F)),
                            totalFTDSaleOrders
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.MSCSDOutletsCount_F)),
                            totalFTDSaleOrders
                        )
                    ]],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    headStyles: HEAD_STYLES,
                    margin: { left: margin, right: margin }
                });
                
                yPos = doc.lastAutoTable.finalY + 5;

                // ===== Volume Wise Info=====
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text("Volume Wise Info", margin, yPos);
                yPos += 3;

                doc.autoTable({
                    startY: yPos,
                    head: [["CSD", "SSRB", "Slice", "Sting", "Aquafina", "Gatorade", "Zero Sugar", "Pepsi", "M.Dew", "7up", "Mirinda", "SS CSD", "MS CSD"]],
                    body: [
                        [
                            sumArr(allPSRs.map(p => p.CSDVol_F)),
                            sumArr(allPSRs.map(p => p.SSRBVol_F)),
                            sumArr(allPSRs.map(p => p.SliceVol_F)),
                            sumArr(allPSRs.map(p => p.StingVol_F)),
                            sumArr(allPSRs.map(p => p.AqfVol_F)),
                            sumArr(allPSRs.map(p => p.GatVol_F)),
                            sumArr(allPSRs.map(p => p.ZSVol_F)),
                            sumArr(allPSRs.map(p => p.PepsiVol_F)),
                            sumArr(allPSRs.map(p => p.DewVol_F)),
                            sumArr(allPSRs.map(p => p.SevupVol_F)),
                            sumArr(allPSRs.map(p => p.MirVol_F)),
                            sumArr(allPSRs.map(p => p.SSCSDVol_F)),
                            sumArr(allPSRs.map(p => p.MSCSDVol_F))
                        ]
                    ],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    headStyles: HEAD_STYLES,
                    margin: { left: margin, right: margin }
                    
                });

                yPos = doc.lastAutoTable.finalY + 2;

                // % INFO // 

               const totalFTDOrderQty = sumArr(allPSRs.map(p => p.FTDOrderQty));


                doc.autoTable({
                    startY: yPos,
                    head: [["CSD", "SSRB", "Slice", "Sting", "Aquafina", "Gatorade", "Zero Sugar", "Pepsi", "M.Dew", "7up", "Mirinda", "SS CSD", "MS CSD"]],
                    body: [
                       [
                        pct(
                            sumArr(allPSRs.map(p => p.CSDVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.SSRBVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.SliceVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.StingVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.AqfVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.GatVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.ZSVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.PepsiVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.DewVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.SevupVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.MirVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.SSCSDVol_F)),
                            totalFTDOrderQty
                        ),
                        pct(
                            sumArr(allPSRs.map(p => p.MSCSDVol_F)),
                            totalFTDOrderQty
                        )
                    ]],
                    theme: "grid",
                    styles: TABLE_STYLES,
                    headStyles: HEAD_STYLES,
                    margin: { left: margin, right: margin }
                });
                
                yPos = doc.lastAutoTable.finalY + 5;


     
     


            }
            ,
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
                doc.text("TDM Summary Report", pageWidth / 2, yPos, { align: "center" } ); 
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
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 } }
            });

            yPos = doc.lastAutoTable.finalY + 6;

            // ===== VISITS SUMMARY =====
            const SaleTargetAchievement = (p) => {
                return p?.MTDTargetin250ml && p?.MTDSalein250ml
                    ? ((parseFloat(p.MTDSalein250ml) / parseFloat(p.MTDTargetin250ml)) * 100).toFixed(2) + "%"
                    : "0.00%";
            };

            const PercTime = (p) => {
                return p?.TotalTimeinOutlet && p?.TotalDurationinMins
                    ? ((parseFloat(p.TotalTimeinOutlet) / parseFloat(p.TotalDurationinMins)) * 100).toFixed(2) + "%"
                    : "0.00%";
            };

            const visitRows = [
                ["Month Target Ach %", ...psrs.map(p => SaleTargetAchievement(p))],
                ["Prior Day Orders", ...psrs.map(p => p.PriorDayOrders || 0)],
                ["No Deliveries ", ...psrs.map(p => p.NoDeliverYesterday || 0)],
                ["Avg Time in Outlet", ...psrs.map(p => p?.AvgTimeInOutlet != null ? parseFloat(p.AvgTimeInOutlet).toFixed(2) : "0.00")],
                ["% of Time", ...psrs.map(p => PercTime(p))],
                ["Planned", ...psrs.map(p => p.PlannedOutlets || 0)],
                ["Completed", ...psrs.map(p => p.CompletedOutlets || 0)],
                ["Not Completed", ...psrs.map(p => p.NotCompleted || 0)],
                ["Unplanned", ...psrs.map(p => p.UnplannedOutlets || 0)],
                ["Productive", ...psrs.map(p => p.ProductiveOutlets || 0)],
                ["Unproductive", ...psrs.map(p => p.UnproductiveOutlets || 0)],
                ["Total Orders", ...psrs.map(p => (parseInt(p.ProductiveOutlets) || 0) + (parseInt(p.UnplannedOutlets) || 0))]
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

                    // ===== TOTAL CALCULATIONS =====
                    const totals = {
                        ftdPlanned: sumArr(psrs.map(p => p.PlannedOutlets)),
                        ftdCC: sumArr(psrs.map(p => p.CompletedOutlets)),
                        ftdCCGPS: sumArr(psrs.map(p => p.FTDCompletedCallsWithin50m)),
                        ftdSR: sumArr(psrs.map(p => p.ProductiveOutlets)),
                        ftdSRGPS: sumArr(psrs.map(p => p.FTDStrikeRateWithin50m)),

                        mtdPlanned: sumArr(psrs.map(p => p.MTD_PlannedCalls)),
                        mtdCC: sumArr(psrs.map(p => p.MTDCompletedOutlets)),
                        mtdCCGPS: sumArr(psrs.map(p => p.MTDCompletedCallsWithin50m)),
                        mtdSR: sumArr(psrs.map(p => p.MTDProductiveOutlets)),
                        mtdSRGPS: sumArr(psrs.map(p => p.MTDStrikeRateWithin50m))
                    };

                    // ===== TABLE ROWS =====
                    const ccsrRows = [

                        // ===== FTD HEADING (single time) =====
                        ["FTD", ...psrs.map(() => ""), ""],

                        ["CC Total", ...psrs.map(p => p.CompletedOutlets || 0), totals.ftdCC],
                        ["CC GPS", ...psrs.map(p => p.FTDCompletedCallsWithin50m || 0), totals.ftdCCGPS],
                        ["CC %", ...psrs.map(p =>
                            pct(p.CompletedOutlets || 0, p.PlannedOutlets || 0)
                        ), pct(totals.ftdCC, totals.ftdPlanned)],

                        ["SR Total", ...psrs.map(p => p.ProductiveOutlets || 0), totals.ftdSR],
                        ["SR GPS", ...psrs.map(p => p.FTDStrikeRateWithin50m || 0), totals.ftdSRGPS],
                        ["SR %", ...psrs.map(p =>
                            pct(p.ProductiveOutlets || 0, p.PlannedOutlets || 0)
                        ), pct(totals.ftdSR, totals.ftdPlanned)],

                        // ===== MTD HEADING (single time) =====
                        ["MTD", ...psrs.map(() => ""), ""],

                        ["CC Total", ...psrs.map(p => p.MTDCompletedOutlets || 0), totals.mtdCC],
                       ["CC GPS", ...psrs.map(p => p.MTDCompletedCallsWithin50m || 0), totals.mtdCCGPS],
                        ["CC %", ...psrs.map(p =>
                            pct(p.MTDCompletedOutlets || 0, p.MTD_PlannedCalls || 0)
                        ), pct(totals.mtdCC, totals.mtdPlanned)],

                        ["SR Total", ...psrs.map(p => p.MTDProductiveOutlets || 0), totals.mtdSR],
                        ["SR GPS", ...psrs.map(p => p.MTDStrikeRateWithin50m || 0), totals.mtdSRGPS],
                        ["SR %", ...psrs.map(p =>
                            pct(p.MTDProductiveOutlets || 0, p.MTD_PlannedCalls || 0)
                        ), pct(totals.mtdSR, totals.mtdPlanned)]
                    ];

                    // ===== AutoTable =====
                    doc.autoTable({
                        startY: yPos,
                        head: [[" ", ...psrs.map(p => p.PSR_ID), "TOTAL"]],
                        body: ccsrRows,
                        theme: "grid",
                        styles: { fontSize: 6, cellPadding: 0.4, halign: "center" },
                        headStyles: {
                            fillColor: [13, 71, 161],
                            textColor: [255, 255, 255],
                            fontStyle: "bold"
                        },
                        columnStyles: {
                            0: { fontStyle: "bold", cellWidth: 38 }
                        },
                        didParseCell: function (data) {
                            // Style FTD / MTD separator rows
                            if (data.row.raw[0] === "FTD" || data.row.raw[0] === "MTD") {
                                data.cell.styles.fontStyle = "bold";
                                data.cell.styles.fillColor = [230, 230, 230];
                                data.cell.styles.halign = "left";
                            }
                        }
                    });

                    yPos = doc.lastAutoTable.finalY + 6;

             
           // ===== ORDER =====
            doc.setFont(undefined, "bold");
            doc.text("Order", margin, yPos);
            yPos += 3;

            const calcDropSize = (orderQty, productiveOutlets, decimals = 1) => {
                return productiveOutlets ? (orderQty / productiveOutlets).toFixed(decimals) : "0.0";
            };

            // ===== TOTALS =====
            const orderTotals = {
                ftdQty: sumArr(psrs.map(p => p.FTDOrderQty)),
                ftdSkus: sumArr(psrs.map(p => p.FTDOrderSkusUnq)),
                ftdOrders: sumArr(psrs.map(p => p.FTDSaleOrders)),
                ftdTotalSkus: sumArr(psrs.map(p => p.FTDOrderSkus)),
                
                
                mtdQty: sumArr(psrs.map(p => p.MTDOrderQty)),
                mtdSkus: sumArr(psrs.map(p => p.MTDOrderSkusUnq)),
                mtdOrders: sumArr(psrs.map(p => p.MTDSaleOrders)),
                mtdTotalSkus: sumArr(psrs.map(p => p.MTDOrderSkus))
            };
            
            // ===== TABLE ROWS =====
            const orderRows = [

                // ===== FTD =====
                ["FTD", ...psrs.map(() => ""), ""],

                ["Qty", ...psrs.map(p => p.FTDOrderQty || 0), orderTotals.ftdQty.toFixed(0)],
                ["SKUs", ...psrs.map(p => p.FTDOrderSkusUnq || 0), orderTotals.ftdSkus],
                ["SKU / Order", ...psrs.map(p => div(p.FTDOrderSkus, p.FTDSaleOrders)), div(orderTotals.ftdTotalSkus, orderTotals.ftdOrders, 1)],
                ["Drop Size", ...psrs.map(p => div(p.FTDOrderQty, p.FTDSaleOrders)), div(orderTotals.ftdQty, orderTotals.ftdOrders, 1)],

                // ===== MTD =====
                ["MTD", ...psrs.map(() => ""), ""],

                ["Qty", ...psrs.map(p => p.MTDOrderQty || 0), orderTotals.mtdQty.toFixed(0)],
                ["SKUs", ...psrs.map(p => p.MTDOrderSkusUnq || 0), orderTotals.mtdSkus],
                ["SKU / Order", ...psrs.map(p => div(p.MTDOrderSkus, p.MTDSaleOrders)), div(orderTotals.mtdTotalSkus, orderTotals.mtdOrders, 1)],
                ["Drop Size", ...psrs.map(p => div(p.MTDOrderQty, p.MTDSaleOrders)), div(orderTotals.mtdQty, orderTotals.mtdOrders, 1)]
            ];

            // ===== AutoTable =====
            doc.autoTable({
                startY: yPos,
                head: [[" ", ...psrs.map(p => p.PSR_ID), "TOTAL"]],
                body: orderRows,
                theme: "grid",
                styles: { fontSize: 6, cellPadding: 0.4, halign: "center" },
                headStyles: {
                    fillColor: [13, 71, 161],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },
                columnStyles: {
                    0: { fontStyle: "bold", cellWidth: 38 }
                },
                didParseCell: function (data) {
                    if (data.row.raw[0] === "FTD" || data.row.raw[0] === "MTD") {
                        data.cell.styles.fontStyle = "bold";
                        data.cell.styles.fillColor = [230, 230, 230];
                        data.cell.styles.halign = "left";
                    }
                }
            });
            yPos = doc.lastAutoTable.finalY + 6;

           
        // ===== SALE =====
            doc.setFont(undefined, "bold");
            doc.text("Sale", margin, yPos);
            yPos += 3;

            // ===== TOTALS =====
            const saleTotals = {
                ftdSalePhy: sumArr(psrs.map(p => p.FTDSalePhysical)),
                ftdSale250: sumArr(psrs.map(p => p.FTDSalein250ml)),
                ftdSkuCnt: sumArr(psrs.map(p => p.FTDSaleSkuCount)),
                ftdBills: sumArr(psrs.map(p => p.FTDSaleOrders)),

                mtdSalePhy: sumArr(psrs.map(p => p.MTDSalePhysical)),
                mtdSale250: sumArr(psrs.map(p => p.MTDSalein250ml)),
                mtdSkuCnt: sumArr(psrs.map(p => p.MTDSaleSkuCount)),
                mtdBills: sumArr(psrs.map(p => p.MTDSaleOrders)),
                mtdTarget250: sumArr(psrs.map(p => p.MTDTargetin250ml))
            };

            const avgBomPerDay =
                saleTotals.mtdTarget250 && totalDays
                    ? (saleTotals.mtdTarget250 / totalDays).toFixed(1)
                    : "0.0";

            // ===== TABLE ROWS =====
            const saleRows = [

                // ===== FTD =====
                ["FTD", ...psrs.map(() => ""), ""],

                ["Actual Sale (Phy)", ...psrs.map(p => p.FTDSalePhysical || 0), saleTotals.ftdSalePhy.toFixed(0)],
                ["Actual Sale (250ml)", ...psrs.map(p => p.FTDSalein250ml || 0), saleTotals.ftdSale250.toFixed(0)],
                ["SKU / Invoice", ...psrs.map(p =>
                    div(p.FTDSaleSkuCount, p.FTDSaleOrders)
                ), div(saleTotals.ftdSkuCnt, saleTotals.ftdBills, 1)],
                ["Drop Size", ...psrs.map(p =>
                    div(p.FTDSalePhysical, p.FTDSaleOrders)
                ), div(saleTotals.ftdSalePhy, saleTotals.ftdBills, 2)],

                // ===== MTD =====
                ["MTD", ...psrs.map(() => ""), ""],

                ["Actual Sale (Phy)", ...psrs.map(p => p.MTDSalePhysical || 0), saleTotals.mtdSalePhy.toFixed(0)],
                ["Actual Sale (250ml)", ...psrs.map(p => p.MTDSalein250ml || 0), saleTotals.mtdSale250.toFixed(0)],
                ["Month Target (250ml)", ...psrs.map(p => p.MTDTargetin250ml || 0), saleTotals.mtdTarget250.toFixed(0)],
                ["BOM / Per Day Req", ...psrs.map(p =>
                    p.MTDTargetin250ml && totalDays ? (p.MTDTargetin250ml / totalDays).toFixed(1) : "0.0"
                ), avgBomPerDay],
                ["SKU / Invoice", ...psrs.map(p =>
                    div(p.MTDSaleSkuCount, p.MTDSaleOrders)
                ), div(saleTotals.mtdSkuCnt, saleTotals.mtdBills, 1)],
                ["Drop Size", ...psrs.map(p =>
                    div(p.MTDSalePhysical, p.MTDSaleOrders)
                ), div(saleTotals.mtdSalePhy, saleTotals.mtdBills, 2)]
            ];

            // ===== AutoTable =====
            doc.autoTable({
                startY: yPos,
                head: [[" ", ...psrs.map(p => p.PSR_ID), "TOTAL"]],
                body: saleRows,
                theme: "grid",
                styles: { fontSize: 5.5, cellPadding: 0.3, halign: "center" },
                headStyles: {
                    fillColor: [13, 71, 161],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },
                columnStyles: {
                    0: { fontStyle: "bold", cellWidth: 40 }
                },
                didParseCell: function (data) {
                    if (data.row.raw[0] === "FTD" || data.row.raw[0] === "MTD") {
                        data.cell.styles.fontStyle = "bold";
                        data.cell.styles.fillColor = [230, 230, 230];
                        data.cell.styles.halign = "left";
                    }
                }
            });

            yPos = doc.lastAutoTable.finalY + 6;

       // ===== CUSTOMER QTY INTERVALS =====
                doc.setFont(undefined, "bold");
                doc.text("Customer Qty Intervals", margin, yPos);
                yPos += 3;

                // ===== TOTALS =====
                const qtyTotals = {
                    qty1: sumArr(psrs.map(p => p.Qty1)),
                    qty2: sumArr(psrs.map(p => p.Qty2)),
                    qty3: sumArr(psrs.map(p => p.Qty3)),
                    qty4to5: sumArr(psrs.map(p => p.Qty4To5)),
                    qty6to10: sumArr(psrs.map(p => p.Qty6To10)),
                    qty11to20: sumArr(psrs.map(p => p.Qty11To20)),
                    qtyGT20: sumArr(psrs.map(p => p.QtyGT20))
                };

                // ===== TABLE ROWS (KPIs LEFT) =====
                const qtyIntervalRows = [
                    ["Qty = 1", ...psrs.map(p => p.Qty1 || 0), qtyTotals.qty1],
                    ["Qty = 2", ...psrs.map(p => p.Qty2 || 0), qtyTotals.qty2],
                    ["Qty = 3", ...psrs.map(p => p.Qty3 || 0), qtyTotals.qty3],
                    ["Qty = 4–5", ...psrs.map(p => p.Qty4To5 || 0), qtyTotals.qty4to5],
                    ["Qty = 6–10", ...psrs.map(p => p.Qty6To10 || 0), qtyTotals.qty6to10],
                    ["Qty = 11–20", ...psrs.map(p => p.Qty11To20 || 0), qtyTotals.qty11to20],
                    ["Qty > 20", ...psrs.map(p => p.QtyGT20 || 0), qtyTotals.qtyGT20]
                ];

                // ===== AutoTable =====
                doc.autoTable({
                    startY: yPos,
                    head: [[" ", ...psrs.map(p => p.PSR_ID), "TOTAL"]],
                    body: qtyIntervalRows,
                    theme: "grid",
                    styles: { fontSize: 6, cellPadding: 0.4, halign: "center" },
                    headStyles: {
                        fillColor: [13, 71, 161],
                        textColor: [255, 255, 255],
                        fontStyle: "bold"
                    },
                    columnStyles: {
                        0: { fontStyle: "bold", cellWidth: 38 }
                    }
                });

                yPos = doc.lastAutoTable.finalY + 6;

         // New page for remaining sections if needed
            if (yPos > 240) {
                doc.addPage();
                yPos = 14;
            }

           
         // ===== REASON FOR NO CALL / NO ORDER =====
            doc.setFont(undefined, "bold");
            doc.text("Reason For No Call / No Order", margin, yPos);
            yPos += 3;

            const noCallRows = [

                // ===== FTD =====
                ["FTD", ...psrs.map(() => ""), ""],

                ["No Time", ...psrs.map(p => p.FTDNoTime || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDNoTime) || 0), 0)
                ],
                ["Area Inaccessible", ...psrs.map(p => p.FTDAreaInacc || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDAreaInacc) || 0), 0)
                ],
                ["Outlet Closed", ...psrs.map(p => p.FTDOutletClose || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDOutletClose) || 0), 0)
                ],
                ["Over Stock", ...psrs.map(p => p.FTDOverStock || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDOverStock) || 0), 0)
                ],
                ["No Owner", ...psrs.map(p => p.FTDNoOwner || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDNoOwner) || 0), 0)
                ],
                ["No Fund", ...psrs.map(p => p.FTDNoFund || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDNoFund) || 0), 0)
                ],
                ["Price Disparity", ...psrs.map(p => p.FTDPriceDisparity || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDPriceDisparity) || 0), 0)
                ],

                // ===== MTD =====
                ["MTD", ...psrs.map(() => ""), ""],

                ["No Time", ...psrs.map(p => p.MTDNoTime || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDNoTime) || 0), 0)
                ],
                ["Area Inaccessible", ...psrs.map(p => p.MTDAreaInacc || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDAreaInacc) || 0), 0)
                ],
                ["Outlet Closed", ...psrs.map(p => p.MTDOutletClose || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDOutletClose) || 0), 0)
                ],
                ["Over Stock", ...psrs.map(p => p.MTDOverStock || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDOverStock) || 0), 0)
                ],
                ["No Owner", ...psrs.map(p => p.MTDNoOwner || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDNoOwner) || 0), 0)
                ],
                ["No Fund", ...psrs.map(p => p.MTDNoFund || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDNoFund) || 0), 0)
                ],
                ["Price Disparity", ...psrs.map(p => p.MTDPriceDisparity || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDPriceDisparity) || 0), 0)
                ]
            ];

            doc.autoTable({
                startY: yPos,
                head: [[" ", ...psrs.map(p => p.PSR_ID), "TOTAL"]],
                body: noCallRows,
                theme: "grid",
                styles: { fontSize: 6, cellPadding: 0.4, halign: "center" },
                headStyles: {
                    fillColor: [13, 71, 161],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },
                columnStyles: {
                    0: { fontStyle: "bold", cellWidth: 40 }
                },
                didParseCell: function (data) {
                    if (data.row.raw[0] === "FTD" || data.row.raw[0] === "MTD") {
                        data.cell.styles.fontStyle = "bold";
                        data.cell.styles.fillColor = [230, 230, 230];
                        data.cell.styles.halign = "left";
                    }
                }
            });

            yPos = doc.lastAutoTable.finalY + 6;

         // ===== REASON FOR NO DELIVERY =====
            doc.setFont(undefined, "bold");
            doc.text("Reason For No Delivery", margin, yPos);
            yPos += 3;

            const noDeliveryRows = [

                ["FTD", ...psrs.map(() => ""), ""],

                ["No Time", ...psrs.map(p => p.FTDNoTime_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDNoTime_ND) || 0), 0)
                ],
                ["Area Inaccessible", ...psrs.map(p => p.FTDAreaInAcc_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDAreaInAcc_ND) || 0), 0)
                ],
                ["Outlet Closed", ...psrs.map(p => p.FTDOutletClosed_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDOutletClosed_ND) || 0), 0)
                ],
                ["No Money", ...psrs.map(p => p.FTDNoMoney_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDNoMoney_ND) || 0), 0)
                ],
                ["No Order", ...psrs.map(p => p.FTDNoOrder_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDNoOrder_ND) || 0), 0)
                ],
                ["Stock Unavailable", ...psrs.map(p => p.FTDStockUnavail || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDStockUnavail) || 0), 0)
                ],
                ["No Empty", ...psrs.map(p => p.FTDNoEmpty_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.FTDNoEmpty_ND) || 0), 0)
                ],

                ["MTD", ...psrs.map(() => ""), ""],

                ["No Time", ...psrs.map(p => p.MTDNoTime_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDNoTime_ND) || 0), 0)
                ],
                ["Area Inaccessible", ...psrs.map(p => p.MTDAreaInAcc_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDAreaInAcc_ND) || 0), 0)
                ],
                ["Outlet Closed", ...psrs.map(p => p.MTDOutletClosed_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDOutletClosed_ND) || 0), 0)
                ],
                ["No Money", ...psrs.map(p => p.MTDNoMoney_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDNoMoney_ND) || 0), 0)
                ],
                ["No Order", ...psrs.map(p => p.MTDNoOrder_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDNoOrder_ND) || 0), 0)
                ],
                ["Stock Unavailable", ...psrs.map(p => p.MTDStockUnavail || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDStockUnavail) || 0), 0)
                ],
                ["No Empty", ...psrs.map(p => p.MTDNoEmpty_ND || 0),
                    psrs.reduce((s, p) => s + (parseInt(p.MTDNoEmpty_ND) || 0), 0)
                ]
            ];

            doc.autoTable({
                startY: yPos,
                head: [[" ", ...psrs.map(p => p.PSR_ID), "TOTAL"]],
                body: noDeliveryRows,
                theme: "grid",
                styles: { fontSize: 5.5, cellPadding: 0.4, halign: "center" },
                headStyles: {
                    fillColor: [13, 71, 161],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },
                columnStyles: {
                    0: { fontStyle: "bold", cellWidth: 40 }
                },
                didParseCell: function (data) {
                    if (data.row.raw[0] === "FTD" || data.row.raw[0] === "MTD") {
                        data.cell.styles.fontStyle = "bold";
                        data.cell.styles.fillColor = [230, 230, 230];
                        data.cell.styles.halign = "left";
                    }
                }
            });

            yPos = doc.lastAutoTable.finalY + 6;

            // Check if we need a new page
            if (yPos > 200) {
                doc.addPage();
                yPos = 14;
            }

            // ===== OUTLET WISE INFO (COUNTS) =====
                doc.setFont(undefined, "bold");
                doc.text("Outlet Wise Info (Counts)", margin, yPos);
                yPos += 3;

                const outletCountTotals = {
                    CSD: sumArr(psrs.map(p => p.CSDOutletsCount)),
                    SSRB: sumArr(psrs.map(p => p.SSRBOutletsCount)),
                    Slice: sumArr(psrs.map(p => p.SliceOutletsCount)),
                    Sting: sumArr(psrs.map(p => p.StingOutletsCount)),
                    Aqf: sumArr(psrs.map(p => p.AqfOutletsCount)),
                    Gat: sumArr(psrs.map(p => p.GatOutletsCount)),
                    ZS: sumArr(psrs.map(p => p.ZSOutletsCount)),
                    Pepsi: sumArr(psrs.map(p => p.PepsiOutletsCount)),
                    Dew: sumArr(psrs.map(p => p.DewOutletsCount)),
                    Sevup: sumArr(psrs.map(p => p.SevupOutletsCount)),
                    Mir: sumArr(psrs.map(p => p.MirOutletsCount)),
                    SSCSD: sumArr(psrs.map(p => p.SSCSDOutletsCount)),
                    MSCSD: sumArr(psrs.map(p => p.MSCSDOutletsCount))
                };

                const outletCountRows = [
                    ["CSD", ...psrs.map(p => p.CSDOutletsCount || 0), outletCountTotals.CSD],
                    ["SSRB", ...psrs.map(p => p.SSRBOutletsCount || 0), outletCountTotals.SSRB],
                    ["Slice", ...psrs.map(p => p.SliceOutletsCount || 0), outletCountTotals.Slice],
                    ["Sting", ...psrs.map(p => p.StingOutletsCount || 0), outletCountTotals.Sting],
                    ["Aquafina", ...psrs.map(p => p.AqfOutletsCount || 0), outletCountTotals.Aqf],
                    ["Gatorade", ...psrs.map(p => p.GatOutletsCount || 0), outletCountTotals.Gat],
                    ["ZS", ...psrs.map(p => p.ZSOutletsCount || 0), outletCountTotals.ZS],
                    ["Pepsi", ...psrs.map(p => p.PepsiOutletsCount || 0), outletCountTotals.Pepsi],
                    ["M.Dew", ...psrs.map(p => p.DewOutletsCount || 0), outletCountTotals.Dew],
                    ["7up", ...psrs.map(p => p.SevupOutletsCount || 0), outletCountTotals.Sevup],
                    ["Mirinda", ...psrs.map(p => p.MirOutletsCount || 0), outletCountTotals.Mir],
                    ["SS CSD", ...psrs.map(p => p.SSCSDOutletsCount || 0), outletCountTotals.SSCSD],
                    ["MS CSD", ...psrs.map(p => p.MSCSDOutletsCount || 0), outletCountTotals.MSCSD]
                ];

                doc.autoTable({
                    startY: yPos,
                    head: [[" ", ...psrs.map(p => p.PSR_ID), "TOTAL"]],
                    body: outletCountRows,
                    theme: "grid",
                    styles: { fontSize: 5.5, cellPadding: 0.3, halign: "center" },
                    headStyles: {
                        fillColor: [13, 71, 161],
                        textColor: [255, 255, 255],
                        fontStyle: "bold"
                    },
                    columnStyles: { 0: { fontStyle: "bold", cellWidth: 38 } }
                });

                yPos = doc.lastAutoTable.finalY + 4;


            // ===== OUTLET WISE INFO (PERCENTAGES) =====
            doc.setFont(undefined, "bold");
            doc.text("Outlet Wise Info (%)", margin, yPos);
            yPos += 3;

            const totalFTDSaleOrders = sumArr(psrs.map(p => p.FTDSaleOrders));
            //const totalProdOutlets = sumArr(psrs.map(p => p.ProductiveOutlets));

            const outletPercentRows = [
                ["CSD", ...psrs.map(p => pct(p.CSDOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.CSD, totalFTDSaleOrders, 2)],
                ["SSRB", ...psrs.map(p => pct(p.SSRBOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.SSRB, totalFTDSaleOrders, 2)],
                ["Slice", ...psrs.map(p => pct(p.SliceOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.Slice, totalFTDSaleOrders, 2)],
                ["Sting", ...psrs.map(p => pct(p.StingOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.Sting, totalFTDSaleOrders, 2)],
                ["Aquafina", ...psrs.map(p => pct(p.AqfOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.Aqf, totalFTDSaleOrders, 2)],
                ["Gatorade", ...psrs.map(p => pct(p.GatOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.Gat, totalFTDSaleOrders, 2)],
                ["ZS", ...psrs.map(p => pct(p.ZSOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.ZS, totalFTDSaleOrders, 2)],
                ["Pepsi", ...psrs.map(p => pct(p.PepsiOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.Pepsi, totalFTDSaleOrders, 2)],
                ["M.Dew", ...psrs.map(p => pct(p.DewOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.Dew, totalFTDSaleOrders, 2)],
                ["7up", ...psrs.map(p => pct(p.SevupOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.Sevup, totalFTDSaleOrders, 2)],
                ["Mirinda", ...psrs.map(p => pct(p.MirOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.Mir, totalFTDSaleOrders, 2)],
                ["SS CSD", ...psrs.map(p => pct(p.SSCSDOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.SSCSD, totalFTDSaleOrders, 2)],
                ["MS CSD", ...psrs.map(p => pct(p.MSCSDOutletsCount, p.FTDSaleOrders, 2)), pct(outletCountTotals.MSCSD, totalFTDSaleOrders, 2)]
            ];

            doc.autoTable({
                startY: yPos,
                head: [[" ", ...psrs.map(p => p.PSR_ID), "TOTAL"]],
                body: outletPercentRows,
                theme: "grid",
                styles: { fontSize: 5.5, cellPadding: 0.3, halign: "center" },
                columnStyles: { 0: { fontStyle: "bold", cellWidth: 38 } }
            });

            yPos = doc.lastAutoTable.finalY + 6;

           

         // CheEcking if we need a new page 
            if (yPos > 200) {
                doc.addPage();
                yPos = 14;
            }

            // ===== VOLUME WISE INFO =====
            doc.setFont(undefined, "bold");
            doc.text("Volume Wise Info", margin, yPos);
            yPos += 3;

            const volumeTotals = {
                CSD: sumArr(psrs.map(p => p.CSDVol)),
                SSRB: sumArr(psrs.map(p => p.SSRBVol)),
                Slice: sumArr(psrs.map(p => p.SliceVol)),
                Sting: sumArr(psrs.map(p => p.StingVol)),
                Aqf: sumArr(psrs.map(p => p.AqfVol)),
                Gat: sumArr(psrs.map(p => p.GatVol)),
                ZS: sumArr(psrs.map(p => p.ZSVol)),
                Pepsi: sumArr(psrs.map(p => p.PepsiVol)),
                Dew: sumArr(psrs.map(p => p.DewVol)),
                Sevup: sumArr(psrs.map(p => p.SevupVol)),
                Mir: sumArr(psrs.map(p => p.MirVol)),
                SSCSD: sumArr(psrs.map(p => p.SSCSDVol)),
                MSCSD: sumArr(psrs.map(p => p.MSCSDVol))
            };

            const volumeRows = [
                ["CSD", ...psrs.map(p => p.CSDVol || 0), volumeTotals.CSD],
                ["SSRB", ...psrs.map(p => p.SSRBVol || 0), volumeTotals.SSRB],
                ["Slice", ...psrs.map(p => p.SliceVol || 0), volumeTotals.Slice],
                ["Sting", ...psrs.map(p => p.StingVol || 0), volumeTotals.Sting],
                ["Aquafina", ...psrs.map(p => p.AqfVol || 0), volumeTotals.Aqf],
                ["Gatorade", ...psrs.map(p => p.GatVol || 0), volumeTotals.Gat],
                ["ZS", ...psrs.map(p => p.ZSVol || 0), volumeTotals.ZS],
                ["Pepsi", ...psrs.map(p => p.PepsiVol || 0), volumeTotals.Pepsi],
                ["M.Dew", ...psrs.map(p => p.DewVol || 0), volumeTotals.Dew],
                ["7up", ...psrs.map(p => p.SevupVol || 0), volumeTotals.Sevup],
                ["Mirinda", ...psrs.map(p => p.MirVol || 0), volumeTotals.Mir],
                ["SS CSD", ...psrs.map(p => p.SSCSDVol || 0), volumeTotals.SSCSD],
                ["MS CSD", ...psrs.map(p => p.MSCSDVol || 0), volumeTotals.MSCSD]
            ];

            doc.autoTable({
                startY: yPos,
                head: [[" ", ...psrs.map(p => p.PSR_ID), "TOTAL"]],
                body: volumeRows,
                theme: "grid",
                styles: { fontSize: 5.5, cellPadding: 0.3, halign: "center" },
                headStyles: {
                    fillColor: [13, 71, 161],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },
                columnStyles: { 0: { fontStyle: "bold", cellWidth: 38 } }
            });

            yPos = doc.lastAutoTable.finalY + 4;

        // ===== VOLUME WISE INFO (PERCENTAGES) =====

            doc.setFont(undefined, "bold");
            doc.text("Volume Wise Info (%)", margin, yPos);
            yPos += 3;

            // Calculate total FTD Order Qty for percentage calculation
            const totalFTDOrderQty = sumArr(psrs.map(p => p.FTDOrderQty));

            const safePct = (num, den, f = 2) => {
                if (!den || den === 0) {
                    return "0.00%";
                }
                return ((num / den) * 100).toFixed(f) + "%";
            };

            const volumePercentRows = [
                ["CSD", ...psrs.map(p => safePct(p.CSDVol, p.FTDOrderQty)), safePct(volumeTotals.CSD, totalFTDOrderQty)],
                ["SSRB", ...psrs.map(p => safePct(p.SSRBVol, p.FTDOrderQty)), safePct(volumeTotals.SSRB, totalFTDOrderQty)],
                ["Slice", ...psrs.map(p => safePct(p.SliceVol, p.FTDOrderQty)), safePct(volumeTotals.Slice, totalFTDOrderQty)],
                ["Sting", ...psrs.map(p => safePct(p.StingVol, p.FTDOrderQty)), safePct(volumeTotals.Sting, totalFTDOrderQty)],
                ["Aquafina", ...psrs.map(p => safePct(p.AqfVol, p.FTDOrderQty)), safePct(volumeTotals.Aqf, totalFTDOrderQty)],
                ["Gatorade", ...psrs.map(p => safePct(p.GatVol, p.FTDOrderQty)), safePct(volumeTotals.Gat, totalFTDOrderQty)],
                ["ZS", ...psrs.map(p => safePct(p.ZSVol, p.FTDOrderQty)), safePct(volumeTotals.ZS, totalFTDOrderQty)],
                ["Pepsi", ...psrs.map(p => safePct(p.PepsiVol, p.FTDOrderQty)), safePct(volumeTotals.Pepsi, totalFTDOrderQty)],
                ["M.Dew", ...psrs.map(p => safePct(p.DewVol, p.FTDOrderQty)), safePct(volumeTotals.Dew, totalFTDOrderQty)],
                ["7up", ...psrs.map(p => safePct(p.SevupVol, p.FTDOrderQty)), safePct(volumeTotals.Sevup, totalFTDOrderQty)],
                ["Mirinda", ...psrs.map(p => safePct(p.MirVol, p.FTDOrderQty)), safePct(volumeTotals.Mir, totalFTDOrderQty)],
               ["SS CSD", ...psrs.map(p => safePct(p.SSCSDVol, p.FTDOrderQty)), safePct(volumeTotals.SSCSD, totalFTDOrderQty)],
                ["MS CSD", ...psrs.map(p => safePct(p.MSCSDVol, p.FTDOrderQty)), safePct(volumeTotals.MSCSD, totalFTDOrderQty)]
            ];

            doc.autoTable({
                startY: yPos,
                head: [[" ", ...psrs.map(p => p.PSR_ID), "TOTAL"]],
                body: volumePercentRows,
                theme: "grid",
                styles: { fontSize: 5.5, cellPadding: 0.3, halign: "center" },
                headStyles: {
                    fillColor: [13, 71, 161],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },
                columnStyles: { 0: { fontStyle: "bold", cellWidth: 38 } }
            });

            yPos = doc.lastAutoTable.finalY + 6;
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



