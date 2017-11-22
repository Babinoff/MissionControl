/**
 * Created by konrad.sobon on 2017-10-23.
 */
var mongoose = require( 'mongoose' );

var sheetItemSchema = new mongoose.Schema({
    name: String,
    number: String,
    uniqueId: String,
    revisionNumber: String, // Unique Id matching one of the Revisions
    isSelected: Boolean, // used by UI since either sheetItem or sheetTask can be stored in UI they both need it
    identifier: String, // Unique identifier for sheet across models. CentralPath + UniqueId

    isPlaceholder: Boolean,
    isDeleted: Boolean,
    assignedTo: String,
    message: String
});

var revisionItemSchema = new mongoose.Schema({
    description: String,
    sequence: Number,
    number: String,
    date: String,
    issuedTo: String,
    issuedBy: String,
    uniqueId: String
});


var sheetsSchema = new mongoose.Schema(
    {
        centralPath: String,
        sheets: [sheetItemSchema],
        sheetsChanges: [sheetItemSchema],
        revisions: [revisionItemSchema]
    }
);

sheetsSchema.index({"centralPath": "text"});
sheetsSchema.index({'sheets.identifier': 'text'});
sheetsSchema.index({'sheetsChanges.identifier': 'text'});

var Sheets = mongoose.model( 'Sheets', sheetsSchema );