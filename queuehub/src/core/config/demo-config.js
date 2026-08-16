const STORAGE='queuehub-v3';
const CHANNEL='queuehub-v3';
const venue={id:'beichen',name:'北辰休息站（Demo）',location:'示範場域',capacityTarget:3000};
const seed=[
{id:'harbor-noodles',name:'港町麵屋',category:'麵食',aliases:['拉麵','麵','noodle'],current:152,recent:[151,150,149],status:'open',avg:45,updated:Date.now()-22000,integration:'manual'},
{id:'sunrise-bento',name:'日光便當',category:'便當',aliases:['便當','飯盒','bento'],current:87,recent:[86,85,84],status:'open',avg:50,updated:Date.now()-38000,integration:'api'},
{id:'forest-curry',name:'森野咖哩',category:'飯類',aliases:['咖哩','curry'],current:214,recent:[213,212,210],status:'open',avg:55,updated:Date.now()-19000,integration:'gateway'},
{id:'cloud-burger',name:'雲朵漢堡',category:'速食',aliases:['漢堡','burger','薯條'],current:63,recent:[62,61,60],status:'open',avg:38,updated:Date.now()-12000,integration:'manual'},
{id:'stone-hotpot',name:'石庭小鍋',category:'鍋物',aliases:['火鍋','鍋','hotpot'],current:118,recent:[117,116,115],status:'paused',avg:65,updated:Date.now()-145000,integration:'manual'},
{id:'field-rice',name:'田野食堂',category:'飯類',aliases:['飯','丼飯','rice'],current:36,recent:[35,34,33],status:'open',avg:48,updated:Date.now()-27000,integration:'api'},
{id:'north-coffee',name:'北辰咖啡',category:'飲品',aliases:['咖啡','飲料','coffee'],current:301,recent:[300,299,298],status:'open',avg:30,updated:Date.now()-9000,integration:'api'},
{id:'moon-dessert',name:'月台甜點',category:'甜點',aliases:['甜點','蛋糕','dessert'],current:74,recent:[73,72,71],status:'open',avg:42,updated:Date.now()-51000,integration:'manual'}
];
