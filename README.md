Catenate XML
============

A Node.js tool for catenating the sub-elements of a XML documents into a single-well formed document.

# Motivation
When Google changed the timeline feature, we had the option of downloading our travel history. Google allowed downloading summary data in batch, but the details were only available to download through the web UI. Fortunately, I found [instructions to download KML files for each day of one's timeline](https://www.reddit.com/r/GoogleMaps/comments/1g1mbbo/guide_to_massbatch_download_all_your/). Having each day in a file is helpful, but I want to view my history, so I looked for a way to view all the KML files (one from each day in my timeline). 

I didn't find any tools that will easily browse the series of files that represents my timeline, so I thought it would be easy to combine all the files into one. I'd forgotten about the intricacies of XML. I searched for some time for a tool that would simply extract specific elements from a list of files and catenate them into a single file. A bit of coding around XSLT would have been an option, but I decided to make a tool that would be easy to use by folks that want to create one KML file to represent (a piece of) their history.

# Purpose

This tool can be configured to combine the selected elements of any well-formed XML files. The default configuration works with KML files.

# Installation

The tool can be installed via NPM

    npm install catenate-xml

# Usage

The command-line parameters provide the list of files to catenate. If they are KML files, there shouldn't be any need for additional configuration.

    npm exec catenate-xml <list of files>

## Instant execution

The [**npx**](https://docs.npmjs.com/cli/v9/commands/npx?v=true) command allows the tool to be downloaded and executed in one step.

    npx catenate-xml <list of files>

## Configuration

Configuration options are provided in the values of environment variables. Please invoke the tool with no arguments to see a description of all configuration options.

In (most) Linux shells, environment varibles can be specified for an individual command like so:

    CATENATE_TARGET_PARENT=//ListElements npx catenate-xml

## As a module

After installation, the `DocumentCollector` class is instantiated with the XSL expression that specifies the element(s) that should be extracted from each source file and the maximum number of files to open concurrently.

    const collector = new DocumentCollector("//InterestingElementTag", 5);

The instance must then load the document shell that will receive the child elements extracted from the inputs. The location in the document where the extracted elements will be inserted as children is the other parameter.
    await collector.loadShellDocument("./template.xml", "//FutureParentOfCatenatedFileContents");

Now the input files can be ingested. The order of the children is the order of the files listed, similar to using `cat` to catenate the files.

    await collector.ingestFiles(argv.slice(2));

After ingesting the files, use the instance's `doc` property to serialize the result to XML.

    new XMLSerializer().serializeToString(collector.doc)

# Dependencies

The dependencies selected seem to be fairly minimal and seemed to be the most-used JavaScript-based XML processors. If you're aware of better XML libraries, please open an issue on GitHub (and maybe a PR with a working replacement).
