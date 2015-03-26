Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items:{ html:'<a href="https://help.rallydev.com/apps/2.0/doc/">App SDK 2.0 Docs</a>'},
    launch: function() {
        var millisecondsInDay = 86400000;            
        var currentDate = new Date();
        this.startDate = new Date(currentDate - millisecondsInDay*30).toISOString(); //in the last 30 days
        
        this._loadKanbanStateValues().then({
            success:function(){
                this._makeStore();
            },
            scope: this
        });
    },
    
    
    _loadKanbanStateValues:function(){
        return Rally.data.ModelFactory.getModel({
            type: 'UserStory',
            success: function(model){
                model.getField('KanbanState').getAllowedValueStore().load({
                    callback: function(records){
                        this.kanbanStateValues = _.rest(_.invoke(records, 'get', 'StringValue')); //remove first element, 'none'.
                    },
                    scope:this
                });
            },
            scope:this
        });
    },
        
    _makeStore:function(){
        Ext.create('Rally.data.wsapi.Store', {
            model: 'User Story',
            autoLoad: true,
            listeners: {
                load: this._onDataLoaded,
                scope: this
            },
            fetch: ['Name','FormattedID','c_KanbanState'],
            filters:[
                {
                    property: 'KanbanState',
                    operator: '!=',
                    value: ''
                },
                {
                    property: 'LastUpdateDate',
                    operator: '>=',
                    value: this.startDate
                }
            ]
        });
    },
    _onDataLoaded:function(store,records){
        var that = this;
        var recordsByKanbanState = {};
        var kanbanColors = {};
        var colors = ['#d3d3d3','#b0c4de','#778899','#87cefa'];
        var chartData = [];
        var i = 0;
        
        _.each(this.kanbanStateValues, function(value){
            recordsByKanbanState[value] = 0;
            if (colors.length < i) {
                kanbanColors[value] = colors[colors.length-1];
            }
            else{ //if there are more allowed values then colors, default to the last element in colors array
                kanbanColors[value] = colors[i];
            }
            i++;
        });
        
        _.each(records, function(record){
            kanban = record.get('c_KanbanState');
            recordsByKanbanState[kanban]++;
        });
        
        _.each(this.kanbanStateValues, function(value){
            chartData.push({
                name: value,
                y: recordsByKanbanState[value],
                color: kanbanColors[value]
            });
            
        });
        this.add({
            xtype: 'rallychart',
            height:400,
            storeType:'Rally.data.wsapi.Store',
            store:  store,
            itemId: 'storiesByKanban',
            chartConfig:{
                chart:{},
                title:{
                    text: 'Stories By Kanban' ,
                    align: 'center'
                },
                tooltip:{
                    formatter: function(){
                        return this.point.name + ': <b>' + Highcharts.numberFormat(this.percentage, 1) + '%</b><br />Count: ' + this.point.y;
                    }
                },
                plotOptions:{
                    pie:{
                        allowPointSelect:true,
                        cursor: 'pointer',
                        dataLabels:{
                            enabled:true,
                            color: '#000000',
                            connectorColor: '#000000'
                        }
                    }
                }
            },
            chartData:{
                categories: kanban,
                series:[
                    {
                        type:'pie',
                        name:'Kanban States',
                        data: chartData
                    }
                ]
            }

        });
    }
});
