NetworkGraph = function(args) {
  args = args || {};

  this.element    = args.element || 'body';
  this.node_radius = args.node_radius || 6;

  var nodes = [],
      links = [],
      node_mapping = {},
      link_mapping = {};

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
    self.link_selection.each(function(d) {
        var distance = Math.sqrt(Math.pow(d.target.x - d.source.x, 2) + Math.pow(d.target.y - d.source.y, 2))
        var ratio = (distance - self.node_radius) / distance;

        var dx = (d.target.x - d.source.x) * ratio;
        var dy = (d.target.y - d.source.y) * ratio;

        this.setAttribute('x1', d.source.x + dx);
        this.setAttribute('y1', d.source.y + dy);
        this.setAttribute('x2', d.target.x - dx);
        this.setAttribute('y2', d.target.y - dy);

        var link_name = d.source.name + '-' + d.target.name;
//        var element = this;
        this.style.setProperty('stroke-width', link_mapping[link_name] + (link_mapping[link_name] * 0.01));
//        setTimeout(function() {
//          element.style.setProperty('stroke-width', link_mapping[link_name] - (link_mapping[link_name] * 0.01));
//        },3000);
    });

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
//    console.log("width: " + this.width + " height: " + this.height);

    var resize = function() {
      self.vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }

    var svg = d3.select(this.element)
      .append("svg:svg")
      .attr('width', this.width)
      .attr('height', this.height)
      .attr("pointer-events", "all");

    this.vis = svg.append('svg:g')
      .call(d3.behavior.zoom().on("zoom", resize))
      .append('svg:g');

    this.vis.append("svg:rect")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr('fill', 'white');

    this.link_selection = this.vis.append("svg:g").selectAll(".link");
    this.node_selection = this.vis.append("svg:g").selectAll(".node");
    this.label_selection = this.vis.append("svg:g").selectAll("g");

    // add arrow points
    this.vis.append("svg:defs").append("svg:marker")
        .attr("id", 'arrow')
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
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
      var link_name = link.source.toString() + '-' + link.target.toString();
      if (link_mapping[link_name]) {
        // if the link already exists, increase weight of both nodes
        // and make the lines bigger
        nodes[node_mapping[link.source].index].weight++;
        nodes[node_mapping[link.target].index].weight++;
      } else {
        if (node_mapping[link.source]) {
          link.source = node_mapping[link.source];
        } else {
          node_mapping[link.source] = { name: link.source, index: nodes.length };
          nodes.push(node_mapping[link.source]);
          link.source = node_mapping[link.source];
        }
        if (node_mapping[link.target]) {
          link.target = node_mapping[link.target];
        } else {
          node_mapping[link.target] = { name: link.target, index: nodes.length };
          nodes.push(node_mapping[link.target]);
          link.target = node_mapping[link.target];
        }
        links.push(link);
      }
      link_mapping[link_name] = link_mapping[link_name] + 1 || 1;
    });

    this.link_selection = this.link_selection.data(links, function(d) { return d.source.name + "-" + d.target.name; });
    this.link_selection.enter()
        .append("line")
        .attr("id", function (d) { return d.source.name + '_' + d.target.name })
        .attr("class", "link")
        .attr("marker-end", function(d) { return "url(#arrow)"; });
    this.link_selection.exit().remove();

    this.node_selection = this.node_selection.data(nodes, function(d) { return d.name; });
    this.node_selection.enter()
        .append("svg:circle")
        .attr("class", "node")
        .attr("r", this.node_radius)
        .call(this.force.drag);
    this.node_selection.exit().remove();

    this.label_selection = this.label_selection.data(nodes, function(d) { return d.name; });
    var new_label = this.label_selection.enter().append("svg:g");

    // first add a thick white label for better legibility
    new_label.append("svg:text")
        .attr("x", 8)
        .attr("y", ".31em")
        .attr("class", "label shadow")
        .text(function(d) { return d.name; });

    new_label.append("svg:text")
        .attr("x", 8)
        .attr("y", ".31em")
        .attr("class", "label")
        .text(function(d) { return d.name; });

    // restart the layout
    this.force.start();
  };


  this.initialize(args);
};
