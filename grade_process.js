console.log("Airs Started");
var processing = false ;
let all = [] ;
let cgpa ;
chrome.runtime.onMessage.addListener(function(message, sender, senderResponse) {
   if ( !processing ) {
       processing = true ;
      getGrades();
   } 
});

// Everytime we visit the matched url (https://stars.bilkent.edu.tr/airs/index.php?do=advs), 
// the following js code executes by chrome.
let replacements = [
    { from : "251", to : "221"},
    { from : "252", to : "222"},
    { from : "415", to : "417"}
 ] ;
let curriculum = [{"code":"CTIS 151","name":"Introduction to Programming"},{"code":"CTIS 163","name":"Discrete Mathematics "},{"code":"CTIS 165","name":"Fundamentals of Information Systems"},{"code":"ENG 101","name":"English and Composition I"},{"code":"GE 100","name":"Orientation"},{"code":"TURK 101","name":"Turkish I"},{"code":"CTIS 152","name":"Algorithms and Data Structures"},{"code":"CTIS 164","name":"Technical Mathematics with Programming "},{"code":"CTIS 166","name":"Information Technologies"},{"code":"ENG 102","name":"English and Composition II"},{"code":"THM 105","name":"Introduction to Business"},{"code":"TURK 102","name":"Turkish II"},{"code":"CTIS 221","name":"Object Oriented Programming"},{"code":"CTIS 255","name":"Web Technologies I"},{"code":"CTIS 259","name":"Database Management Systems and Applications"},{"code":"CTIS 261","name":"Computer Networks I"},{"code":"ECON 103","name":"Principles of Economics"},{"code":"GE 250","name":"Collegiate Activities Program I"},{"code":"CTIS 222","name":"Object Oriented Analysis and Design"},{"code":"CTIS 256","name":"Web Technologies II"},{"code":"CTIS 262","name":"Computer Networks II"},{"code":"CTIS 264","name":"Computer Algorithms"},{"code":"GE 251","name":"Collegiate Activities Program II"},{"code":"HIST 200","name":"History of Turkey "},{"code":"","name":"Non Technical Elective"},{"code":"CTIS 290","name":"Summer Internship"},{"code":"CTIS 359","name":"Principles of Software Engineering"},{"code":"CTIS 363","name":"Ethical and Social Issues in Information Systems "},{"code":"CTIS 365","name":"Applied Data Analysis"},{"code":"CTIS 487","name":"Mobile Application Development"},{"code":"ELS 301","name":"Advanced Communication Skills"},{"code":"CTIS 310","name":"Semester Internship"},{"code":"CTIS 411","name":"Senior Project I"},{"code":"CTIS 417","name":"Software Design Patterns"},{"code":"CTIS 496","name":"Computer and Network Security"},{"code":"","name":"Management Elective"},{"code":"","name":"Restricted Elective"},{"code":"","name":"Restricted Elective"},{"code":"CTIS 456","name":"Senior Project II"},{"code":"","name":"Restricted Elective"},{"code":"","name":"Restricted Elective"},{"code":"","name":"Unrestricted Elective"},{"code":"","name":"Unrestricted Elective"}];
let lastCurriculum = JSON.stringify(curriculum.filter(cr => cr.code.startsWith("CTIS")).map(cr => cr.code));

function getGrades() {
    console.log("Get Grade started");

    // In Advisee page, it collects all students 
    let captions = document.querySelectorAll("span[tip='Curriculum'] a") ;
    let CGPAs = document.querySelectorAll("[id^='advisees_'] td:nth-of-type(9)");
    cgpa = Array.from(CGPAs);
    cgpa = cgpa.map( item => {
      return item.innerHTML.replace(/&nbsp;/g, "");
    });
    //console.log(cgpa);
    let caps = Array.from(captions)    ;
    //console.log(caps);
    let urls = caps.map( item => {
        // find his/her "id"
        let id = (item.href.split("=")[2]).split("&")[0];
        // build url to retrieve her curriculum
        return "/airs/index.php?do=webservices-redirect&id=" + id + "&service=curriculum&modul=A" ;
    });

    // Her bir öğrenci için curriculum bilgileri isteniyor.
    Promise.all( urls.map(u => fetch(u).then(result=> result.text())))
           .then(texts => {
            // Tüm sonuçlar html formatında geldi,  texts içinde bulunuyor.
            // Herbir öğrencinin curriculum'u için parse işlemi yapılıyor ve processStudent bu bilgileri alacak.
            for ( let text of texts) {
                // html to DOM for easy parsing
                let page = document.createElement("html");
                page.innerHTML = text ;
                processStudent(page);
            }

            // Soyisme göre tüm öğrenciler sıralanacak.
            all.sort((a,b) => a.fullname.localeCompare(b.fullname, "tr")) ;
                
            // CTIS curriculumda olan tüm dersler birinci öğrencinin curriculumundan alınıyor.
            // keys, curriculumdaki dersleri sırasıyla tutuyor.
            let keys = curriculum.slice(0);
           
            // Her ders için her öğrencinin notunu ekle { code:"CTIS151", name: "Introd..", "Ali": "A", "Veli: "C"} gibi.
            let last = keys.map((course,idx) => {
                all.forEach(function(std){
                    if ( std.valid) {
                        course[std.fullname] = std.courses[idx].grade;
                    } else {
                        course[std.fullname] = " " ;
                    }
                });
                return course;
            });

            // CGPA eklemek için
            let cgpa_row = {code:"", "name": ""} ;
            all.forEach(function(std,idx){
               cgpa_row[std.fullname] = cgpa[idx].toString().replace(".", ",") ;
            });
           // console.log(cgpa_row);
            last.push(cgpa_row); 
      
            // "last" is array of courses containing students' grades.
            // convet array into xls. (it actually returns html with .xls extension)
            const xls = new XlsExport(last, 'Grades');
            xls.exportToXLS('airs_grades.xls') ;
            setTimeout(function(){
               // console.log("finished");
                all = [] ;
                cgpa = [] ;
                processing = false ;
                // send message to popup.js
                chrome.runtime.sendMessage({finished : true}) ;
            }, 2000) ;
        }); 
}

// Parsing incoming html curriculum data
function processStudent(page) {
    let curr = [] ;
    // Find user name and lastname from incoming result (html)
    let lastname = $(".row2:first td:eq(1)", page).html();
    let name = $(".row1:first td:eq(1)", page).html();

    // Find all tables for semesters. All semester tables have caption with h3 tag starting with "Fall or Spring"
    $("caption h3", page)
    .filter( function(i) {
        return $(this).html().match(/^(Fall|Spring)/) ;
    })
    .each(function(i) {
        // for each semester, access course rows.
        $("tr:gt(0)",$(this).parent().parent()).each(function(i){
            // for each course, add into curr(iculum) array of the student
            let code = $("td:first", $(this)).html();
            let name = $("td:eq(1)", $(this)).html();
            let status = $("td:eq(2)", $(this)).html();
            let grade = $("td:eq(3)", $(this)).html().replace(/&nbsp;/g, "");
            let taken = $("td:eq(6)", $(this)).html().replace(/&nbsp;/g, "").replace("<br>","");
            curr.push({
                code, name, status, grade, taken
            });
        }); 
    });
 
    // If a course has an empty grade, check out if the student took that course before
    // It fills with F,FX,FZ or W instead of blank.
    for ( let i=0; i < curr.length; i++) {

        if ( curr[i].status == "Not graded") {
            curr[i].grade = "X" ;
        } else 
        if ( curr[i].code == "" && curr[i].name == "") {
            if ( curr[i-1].grade == "") {
                curr[i-1].grade = curr[i].grade ;
            }
        }
    }

    // Delete rows that represent previous taken courses
    let courses = curr.filter(item => item.code != "" || item.name != "") ;
    let curriculumStr = JSON.stringify(courses.filter(cr => cr.code.startsWith("CTIS")).map(cr => cr.code));
    // replacements
    replacements.forEach( trans => {
        curriculumStr =  curriculumStr.replace(trans.from, trans.to) ;
    });
    console.log(lastname + " : " + curriculumStr);
 
    // Add student fullname and her courses/grades into "all" array.
    all.push({
        "fullname" : lastname + " " + name,
        "courses" : courses,
        "valid" : curriculumStr === lastCurriculum
    });
}
