"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.phase2Reviews = exports.phase2Emails = void 0;
exports.allocateEmailId = allocateEmailId;
exports.allocateAttachmentId = allocateAttachmentId;
exports.allocateHistoryId = allocateHistoryId;
exports.allocateAnalysisId = allocateAnalysisId;
exports.upsertPhase2Email = upsertPhase2Email;
var mock_data_1 = require("./mock-data");
exports.phase2Emails = new Map();
exports.phase2Reviews = new Map();
var nextEmailId = Math.max.apply(Math, mock_data_1.emails.map(function (email) { return email.id; })) + 1;
var nextAnalysisId = 1;
var nextAttachmentId = 1;
var nextHistoryId = 1;
var seedBodies = [
    "Please quote 2 units of PN PT6A-42 FUEL PUMP in serviceable condition. We need pricing and availability ASAP.",
    "We need repair pricing and turnaround time for PW127M STARTER. Please include teardown report requirements.",
    "Please quote overhaul for the hydraulic valve listed below. FAA 8130-3 certification requested.",
    "Please quote availability for VHF TRANSCEIVER 822-101. Standard warranty terms are acceptable.",
];
var seededRfqByEmailId = { 1: 1, 2: 3, 3: 4, 4: 6 };
mock_data_1.emails.forEach(function (email, index) {
    var _a, _b, _c;
    var rfq = (_a = mock_data_1.rfqs.find(function (item) { return item.id === seededRfqByEmailId[email.id]; })) !== null && _a !== void 0 ? _a : null;
    var confidenceScore = email.confidence / 100;
    var requiresHumanReview = email.confidence < 85;
    var analysis = {
        id: nextAnalysisId++,
        emailClassification: "RFQ",
        requestType: email.requestType,
        confidenceScore: confidenceScore,
        reasoningSummary: requiresHumanReview
            ? "The email appears to be an aviation request, but the AI needs a human to confirm the classification or missing service details."
            : "Email contains a clear aviation part number, quantity, and request for quotation.",
        requiresHumanReview: requiresHumanReview,
        developmentMode: true,
        extractedData: {
            customer: { name: email.sender, company: email.sender, email: email.senderEmail },
            items: [{ partNumber: (_b = rfq === null || rfq === void 0 ? void 0 : rfq.partNumber) !== null && _b !== void 0 ? _b : "UNKNOWN", description: (_c = rfq === null || rfq === void 0 ? void 0 : rfq.partNumber) !== null && _c !== void 0 ? _c : "Aviation component", quantity: 2, condition: "Serviceable", requestedCondition: "Serviceable" }],
            requirements: { certification: ["FAA 8130-3"], deliveryRequirement: "ASAP", urgency: email.confidence < 75 ? "HIGH" : "MEDIUM" },
            summary: seedBodies[index],
        },
    };
    var record = __assign(__assign({}, email), { recipient: "sales@minternational.aero", cc: "", bodyText: seedBodies[index], bodyHtml: "<p>".concat(seedBodies[index], "</p>"), processingStatus: requiresHumanReview ? "REVIEW_REQUIRED" : "PROCESSED", emailClassification: "RFQ", attachments: index === 1 ? [{
                id: nextAttachmentId++,
                emailId: email.id,
                fileName: "PW127M-service-request.pdf",
                contentType: "application/pdf",
                fileSize: 248320,
                processingStatus: "EXTRACTED",
                extractedText: "PW127M STARTER — repair pricing and turnaround time requested.",
            }] : [], analysis: analysis, linkedRfq: rfq, microsoftMessageId: "dev-message-".concat(email.id), internetMessageId: "<dev-".concat(email.id, "@minternational.local>"), conversationId: "dev-thread-".concat(email.id), createdAt: email.receivedAt });
    exports.phase2Emails.set(record.id, record);
    if (requiresHumanReview && rfq) {
        exports.phase2Reviews.set(rfq.id, {
            rfqId: rfq.id,
            emailId: record.id,
            emailSubject: record.subject,
            createdAt: record.createdAt,
            analysis: analysis,
            reviewHistory: [],
        });
    }
});
function allocateEmailId() {
    return nextEmailId++;
}
function allocateAttachmentId() {
    return nextAttachmentId++;
}
function allocateHistoryId() {
    return nextHistoryId++;
}
function allocateAnalysisId() {
    return nextAnalysisId++;
}
function upsertPhase2Email(email) {
    var existing = __spreadArray([], exports.phase2Emails.values(), true).find(function (item) {
        return item.microsoftMessageId === email.microsoftMessageId ||
            (email.internetMessageId && item.internetMessageId === email.internetMessageId);
    });
    if (existing)
        return { email: existing, duplicate: true };
    exports.phase2Emails.set(email.id, email);
    return { email: email, duplicate: false };
}
