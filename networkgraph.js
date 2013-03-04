NetworkGraph = function(args) {
  args = args || {};

  this.element    = args.element || 'body';
  this.node_width = args.node_width || 6;

  var nodes = [],
      links = [],
      node_mapping = {};

  var self = this;

  var currentWindowSize = function() {
    var width, height;
    if (document.body && document.body.offsetWidth) {
      width = document.body.offsetWidth;
      height = document.body.offsetHeight;
    }
    if (document.compatMode=='CSS1Compat' &&
            document.documentElement &&
            document.documentElement.offsetWidth ) {
      width = document.documentElement.offsetWidth;
      height = document.documentElement.offsetHeight;
    }
    if (window.innerWidth && window.innerHeight) {
      width = window.innerWidth;
      height = window.innerHeight;
    }
    return [ width, height ];
  };

  var tick = function() {
    self.link_selection.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    self.node_selection.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });

    self.label_selection.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });
  }

  this.initialize = function(args) {

    if (!(args.width && args.height)) {
//      // set width to the size of the element if it exists
//      if (typeof window !== undefined) {
//        var style = window.getComputedStyle(this.element, null);
//        this.width = args.width || parseInt(style.getPropertyValue('width'));
//        this.height = args.height || parseInt(style.getPropertyValue('height'));
//      } else {
        // or to the full window size if it isn't
        var dimensions = currentWindowSize();
        this.width  = args.width || dimensions[0];
        this.height = args.height || dimensions[1];
//      }
    } else {
      this.width = args.width;
      this.height = args.height;
    }
    console.log("width: " + this.width + " height: " + this.height);

    this.vis = d3.select(this.element)
      .append("svg:svg")
      .attr('width', this.width)
      .attr('height', this.height);

    this.link_selection = this.vis.append("svg:g").selectAll("line.link");
    this.node_selection = this.vis.append("svg:g").selectAll("node");
    this.label_selection = this.vis.append("svg:g").selectAll("g");

    // add arrow points
    this.vis.append("svg:defs").selectAll("marker")
        .data(["suit", "licensing", "resolved"])
      .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 16)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("markerUnits","strokeWidth")
        .attr("orient", "auto")
      .append("svg:path")
        .attr("d", "M 0,-5 L 10,0 L 0,5 z");

    this.force = d3.layout.force()
        .size([this.width, this.height])
        .nodes(nodes)
        .links(links)
        .linkDistance(60)
        .charge(-300)
        .on("tick", tick);

  };

  this.add_links = function(new_links) {
    // map the new links into our existing distinct node mapping
    new_links.forEach(function(link) {
      if (node_mapping[link.source]) {
        link.source = node_mapping[link.source];
      } else {
        node_mapping[link.source] = { name: link.source };
        nodes.push(node_mapping[link.source]);
        link.source = node_mapping[link.source];
      }
      if (node_mapping[link.target]) {
        link.target = node_mapping[link.target];
      } else {
        node_mapping[link.target] = {name: link.target};
        nodes.push(node_mapping[link.target]);
        link.target = node_mapping[link.target];
      }
      links.push(link);
    });

    this.link_selection = this.link_selection.data(links, function(d) { return d.source.name + "-" + d.target.name; });
    this.link_selection.enter()
        .append("line")
        .attr("class", function(d) { return "link " + d.type; })
        .attr("marker-end", function(d) { return "url(#" + d.type + ")"; });
    this.link_selection.exit().remove();

    this.node_selection = this.node_selection.data(nodes, function(d) { return d.name; });
    this.node_selection.enter()
        .append("svg:circle")
        .attr("class", "node")
        .attr("r", this.node_width)
        .call(this.force.drag);
    this.node_selection.exit().remove();

    this.label_selection = this.label_selection.data(nodes, function(d) { return d.name; });
    var new_label = this.label_selection.enter().append("svg:g");

    // first add a thick white label for better legibility
    new_label.append("svg:text")
        .attr("x", 8)
        .attr("y", ".31em")
        .attr("class", "shadow")
        .text(function(d) { return d.name; });

    new_label.append("svg:text")
        .attr("x", 8)
        .attr("y", ".31em")
        .text(function(d) { return d.name; });

    // restart the layout
    this.force.start();
  };


  this.initialize(args);
};
