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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeRfqEmail = analyzeRfqEmail;
function developmentAnalysis(input) {
    var _a, _b, _c, _d, _e;
    var content = "".concat(input.subject, "\n").concat(input.bodyText, "\n").concat(input.attachmentText).toLowerCase();
    var partNumber = (_c = (_b = (_a = content.match(/\b(?:pn|part(?:\s+number)?)[:\s-]*([a-z0-9]+(?:-[a-z0-9]+)+)\b/i)) === null || _a === void 0 ? void 0 : _a[1]) === null || _b === void 0 ? void 0 : _b.toUpperCase()) !== null && _c !== void 0 ? _c : "UNKNOWN";
    var quantity = Number((_e = (_d = content.match(/\b(?:qty|quantity|units?)[:\s]*(\d+)\b/i)) === null || _d === void 0 ? void 0 : _d[1]) !== null && _e !== void 0 ? _e : 1);
    var requestType = content.includes("overhaul")
        ? "OVERHAUL"
        : content.includes("repair")
            ? "REPAIR"
            : content.includes("exchange") || content.includes("core")
                ? "PARTS_EXCHANGE"
                : partNumber === "UNKNOWN"
                    ? "UNKNOWN"
                    : "NEW_PART_PURCHASE";
    var confidenceScore = partNumber === "UNKNOWN" ? 0.48 : requestType === "UNKNOWN" ? 0.62 : 0.95;
    var requiresHumanReview = confidenceScore < 0.85 || partNumber === "UNKNOWN";
    return {
        id: input.emailId,
        emailClassification: partNumber === "UNKNOWN" && !content.includes("quote") ? "UNKNOWN" : "RFQ",
        requestType: requestType,
        confidenceScore: confidenceScore,
        reasoningSummary: requiresHumanReview
            ? "Development analysis detected incomplete RFQ details and routed the request for human review."
            : "Development analysis found RFQ language, a part number, and a quantity.",
        requiresHumanReview: requiresHumanReview,
        developmentMode: true,
        extractedData: {
            customer: { name: input.senderName, email: input.senderEmail },
            items: [{ partNumber: partNumber, description: "Aviation component", quantity: quantity, condition: "Serviceable", requestedCondition: "Serviceable" }],
            requirements: { certification: [], deliveryRequirement: content.includes("asap") ? "ASAP" : "STANDARD", urgency: content.includes("urgent") || content.includes("asap") ? "HIGH" : "MEDIUM" },
            summary: input.bodyText.slice(0, 240),
        },
    };
}
var openai_1 = __importDefault(require("openai"));
var zod_1 = require("zod");
var zod_2 = require("openai/helpers/zod");
var AnalysisSchema = zod_1.z.object({
    emailClassification: zod_1.z.enum(["RFQ", "UNKNOWN", "OTHER"]),
    requestType: zod_1.z.enum(["PARTS_EXCHANGE", "NEW_PART_PURCHASE", "REPAIR", "OVERHAUL", "UNKNOWN"]),
    confidenceScore: zod_1.z.number().min(0).max(1),
    requiresHumanReview: zod_1.z.boolean(),
    reasoningSummary: zod_1.z.string(),
    extractedData: zod_1.z.object({
        customer: zod_1.z.object({
            name: zod_1.z.string().optional(),
            email: zod_1.z.string().optional(),
        }),
        items: zod_1.z.array(zod_1.z.object({
            partNumber: zod_1.z.string(),
            description: zod_1.z.string().optional(),
            quantity: zod_1.z.number(),
            condition: zod_1.z.string().optional(),
            requestedCondition: zod_1.z.string().optional(),
        })),
        requirements: zod_1.z.object({
            deliveryRequirement: zod_1.z.string().optional(),
            urgency: zod_1.z.string().optional(),
        }),
        summary: zod_1.z.string(),
    }),
});
function analyzeRfqEmail(input) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, openai, model, response, content, parsed;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    apiKey = process.env.OPENROUTER_API_KEY;
                    if (!apiKey) {
                        if (process.env.NODE_ENV === "production") {
                            throw new Error("OPENROUTER_API_KEY is required in production mode");
                        }
                        return [2 /*return*/, developmentAnalysis(input)];
                    }
                    openai = new openai_1.default({
                        apiKey: apiKey,
                        baseURL: "https://openrouter.ai/api/v1",
                    });
                    model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: model,
                            response_format: (0, zod_2.zodResponseFormat)(AnalysisSchema, "analysis"),
                            messages: [
                                {
                                    role: "system",
                                    content: "You classify aviation aftermarket emails. Extract RFQ details. If missing critical info like part numbers, set requiresHumanReview to true. Return only structured data.",
                                },
                                {
                                    role: "user",
                                    content: JSON.stringify({ subject: input.subject, body: input.bodyText, attachmentText: input.attachmentText }),
                                },
                            ],
                        })];
                case 1:
                    response = _c.sent();
                    content = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                    if (!content)
                        throw new Error("AI provider returned no analysis");
                    parsed = JSON.parse(content);
                    return [2 /*return*/, __assign(__assign({}, parsed), { id: input.emailId, developmentMode: false })];
            }
        });
    });
}
